import type { DecisionGraph, GraphEdge, GraphNode } from './graph.js';
import { TAG_COLORS } from './graph.js';
import { MAP_STYLE } from './graph-view.js';
import { CANVAS_STYLE, CANVAS_SCRIPT, canvasHeaderHTML, canvasDockHTML } from './canvas-view.js';
import { SHARE_SCRIPT, SHARE_STYLE } from './share.js';
import { escapeHtml, wrapText, estimateTextWidth } from './view-text.js';

const CARD_W = 248;
const PAD_X = 16;
const PAD_Y = 14;
const META_H = 16;
const TITLE_H = 18;
const FOOTER_H = 14;
const GAP = 6;
const LINE_CHARS = 30;
const COL_GAP = 96;
const NODE_GAP = 22;
const TOP = 72;
const LEFT = 28;
const BOTTOM = 30;

/**
 * The card's footer font size. A decision with a deliberation tree is marked by
 * the card's own pale green fill, not by anything in this row, so the tag run
 * gets the card's whole inner width.
 */
const FOOTER_FONT = 10;
/** Drawing-box margin: room for the stroke width and the arrowheads. */
const MAP_MARGIN = 16;

/** Width of footer text as the card layout budgets it. */
function footerWidth(text: string): number {
  return estimateTextWidth(text, FOOTER_FONT);
}

/** The graph title keeps its "N " prefix; the card shows the number separately. */
function displayTitle(node: GraphNode): string {
  return node.title.replace(/^\d+\s+/, '');
}

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
  height: number;
  lines: string[];
}

interface Column {
  date: string;
  x: number;
  count: number;
}

/** Chronological `created` groups; each becomes one column. */
function groupByDate(nodes: GraphNode[]): Array<[string, GraphNode[]]> {
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const group = groups.get(node.created);
    if (group === undefined) groups.set(node.created, [node]);
    else group.push(node);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function layout(graph: DecisionGraph): { placed: Placed[]; columns: Column[]; width: number; height: number } {
  const columns: Column[] = [];
  const placed: Placed[] = [];
  let x = LEFT;
  let bottom = TOP;
  for (const [date, nodes] of groupByDate(graph.nodes)) {
    columns.push({ date, x, count: nodes.length });
    let y = TOP;
    for (const node of nodes) {
      const lines = wrapText(displayTitle(node), LINE_CHARS);
      const footer = node.tags.length > 0 || node.hasDeliberation ? GAP + FOOTER_H : 0;
      const height = PAD_Y * 2 + META_H + GAP + lines.length * TITLE_H + footer;
      placed.push({ node, x, y, height, lines });
      y += height + NODE_GAP;
    }
    bottom = Math.max(bottom, y - NODE_GAP);
    x += CARD_W + COL_GAP;
  }
  const width = columns.length === 0 ? 320 : x - COL_GAP + LEFT;
  return { placed, columns, width, height: bottom + BOTTOM };
}

/** Assign each first tag a stable color, in order of first appearance. */
function tagColors(nodes: GraphNode[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const node of nodes) {
    if (node.status === 'superseded') continue;
    const tag = node.tags[0];
    if (tag === undefined || colors.has(tag)) continue;
    colors.set(tag, TAG_COLORS[colors.size % TAG_COLORS.length]!);
  }
  return colors;
}

/** A drawn edge: its path plus the box the curve itself spans. */
interface EdgeCurve {
  d: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * The exact span of one cubic on a single axis: the endpoints plus the
 * derivative's roots inside (0,1). The control-point hull is far wider than
 * the curve it bounds, so sizing the drawing box to the hull would leave the
 * map floating in a mostly empty frame.
 */
function cubicSpan(p0: number, p1: number, p2: number, p3: number): { min: number; max: number } {
  const at = (t: number): number => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  let min = Math.min(p0, p3);
  let max = Math.max(p0, p3);
  const consider = (t: number): void => {
    if (!(t > 0 && t < 1)) return;
    const value = at(t);
    min = Math.min(min, value);
    max = Math.max(max, value);
  };
  // B'(t)/3 = a(1-t)^2 + 2b(1-t)t + ct^2, in the form At^2 + Bt + C.
  const a = p1 - p0, b = p2 - p1, c = p3 - p2;
  const A = a - 2 * b + c, B = 2 * (b - a), C = a;
  if (Math.abs(A) < 1e-9) {
    if (Math.abs(B) > 1e-9) consider(-C / B);
  } else {
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      consider((-B + root) / (2 * A));
      consider((-B - root) / (2 * A));
    }
  }
  return { min, max };
}

/**
 * A left-to-right cubic between a source card's right edge and a target's left
 * edge. The bend grows with the horizontal distance, so a long backward edge
 * swings outside the card grid; the caller sizes the drawing box to hold that
 * swing rather than letting the SVG clip it at the map's edge.
 */
function edgeCurve(from: Placed, to: Placed): EdgeCurve {
  const sx = from.x + CARD_W;
  const sy = from.y + from.height / 2;
  const tx = to.x;
  const ty = to.y + to.height / 2;
  const bend = Math.max(40, Math.abs(tx - sx) * 0.4);
  const c1x = sx + bend;
  const c2x = tx - bend;
  const x = cubicSpan(sx, c1x, c2x, tx);
  const y = cubicSpan(sy, sy, ty, ty);
  return {
    d: 'M' + sx + ',' + sy + ' C' + c1x + ',' + sy + ' ' + c2x + ',' + ty + ' ' + tx + ',' + ty,
    minX: x.min,
    maxX: x.max,
    minY: y.min,
    maxY: y.max,
  };
}

/**
 * The `#a  #b` run for up to three tags, filled up to `maxWidth`: it is cut at
 * the last character that still fits beside the marker, so a truncated row
 * reaches the marker instead of stopping a whole tag short of it. An ellipsis
 * marks what was left out — a fourth tag, or the rest of the cut tag.
 */
function fitTagRun(tags: string[], maxWidth: number): string {
  const run = tags.slice(0, 3).map((tag) => '#' + tag).join('  ');
  const more = tags.length > 3;
  if (!more && footerWidth(run) <= maxWidth) return run;
  let cut = '';
  for (const char of run) {
    const next = (cut + char).trimEnd();
    if (footerWidth(next + '…') > maxWidth) break;
    cut += char;
  }
  const kept = cut.trimEnd();
  return (kept === '' ? run.slice(0, 1) : kept) + '…';
}

function nodeMarkup(placed: Placed, colors: Map<string, string>, recordHref: (recordPath: string) => string): string {
  const { node, x, y, height, lines } = placed;
  const classes = ['node'];
  if (node.status === 'superseded') classes.push('superseded');
  if (node.hasDeliberation) classes.push('has-deliberation');
  const firstTag = node.tags[0];
  const stroke = node.status === 'superseded'
    ? '#c2cabf'
    : (firstTag === undefined ? '#dce4dc' : (colors.get(firstTag) ?? '#dce4dc'));
  const metaY = y + PAD_Y + META_H - 5;
  const titleY = y + PAD_Y + META_H + GAP + TITLE_H - 6;
  const parts: string[] = [];
  parts.push('<a href="' + escapeHtml(recordHref(node.path)) + '">');
  parts.push('<g class="' + classes.join(' ') + '" data-adr="' + node.number + '" data-has-deliberation="' + String(node.hasDeliberation) + '">');
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + CARD_W + '" height="' + height + '" rx="12" stroke="' + stroke + '"/>');
  parts.push('<text class="num" x="' + (x + PAD_X) + '" y="' + metaY + '">#' + node.number + '</text>');
  const meta = node.status === 'superseded'
    ? (node.supersededBy === undefined ? 'superseded' : 'superseded by ' + node.supersededBy)
    : node.created;
  parts.push('<text class="meta" x="' + (x + CARD_W - PAD_X) + '" y="' + metaY + '" text-anchor="end">' + escapeHtml(meta) + '</text>');
  lines.forEach((line, index) => {
    parts.push('<text class="title" x="' + (x + PAD_X) + '" y="' + (titleY + index * TITLE_H) + '">' + escapeHtml(line) + '</text>');
  });
  if (node.tags.length > 0) {
    const footerY = titleY + (lines.length - 1) * TITLE_H + GAP + FOOTER_H - 2;
    // The clip is the SVG counterpart of an HTML card's edge: a run the fallback
    // font renders wider than budgeted is cut, never drawn over the card border.
    const budget = CARD_W - PAD_X * 2;
    parts.push('<clipPath id="tags-' + node.number + '"><rect x="' + (x + PAD_X) + '" y="' + (footerY - 10) + '" width="' + budget + '" height="14"/></clipPath>');
    parts.push('<text class="tag" x="' + (x + PAD_X) + '" y="' + footerY + '" clip-path="url(#tags-' + node.number + ')">' + escapeHtml(fitTagRun(node.tags, budget)) + '</text>');
  }
  parts.push('</g>');
  parts.push('</a>');
  return parts.join('');
}

/**
 * Render a decision graph as one self-contained, offline HTML map. The layout
 * is computed here, at generation time, so the page needs no network, no CDN,
 * and no runtime; every node links to its record file.
 */
export function renderDecisionMapHtml(
  graph: DecisionGraph,
  title = 'Decision map',
  recordHref: (recordPath: string) => string = (recordPath) => recordPath,
): string {
  const { placed, columns, width, height } = layout(graph);
  const colors = tagColors(placed.map((entry) => entry.node));
  const byNumber = new Map(placed.map((entry) => [entry.node.number, entry]));
  const edges: string[] = [];
  // A long edge can swing outside the card grid, and the SVG paints only what
  // its viewBox covers: the box has to grow to the curves, not the other way.
  const box = { minX: 0, minY: 0, maxX: width, maxY: height };
  const drawEdge = (edge: GraphEdge, kind: 'supersede' | 'reference'): void => {
    const from = byNumber.get(edge.from);
    const to = byNumber.get(edge.to);
    if (from === undefined || to === undefined) return;
    const curve = edgeCurve(from, to);
    box.minX = Math.min(box.minX, curve.minX);
    box.maxX = Math.max(box.maxX, curve.maxX);
    box.minY = Math.min(box.minY, curve.minY);
    box.maxY = Math.max(box.maxY, curve.maxY);
    edges.push('<path class="edge ' + kind + '" d="' + curve.d + '" marker-end="url(#arrow-' + kind + ')"/>');
  };
  for (const edge of graph.referenceEdges) drawEdge(edge, 'reference');
  for (const edge of graph.supersedeEdges) drawEdge(edge, 'supersede');

  const deliberated = graph.nodes.filter((node) => node.hasDeliberation).length;
  const stats: Array<[string, number]> = [
    ['decisions', graph.nodes.length],
    ['supersessions', graph.supersedeEdges.length],
    ['references', graph.referenceEdges.length],
    ['deliberation trees', deliberated],
  ];
  const viewX = Math.round(box.minX - MAP_MARGIN);
  const viewY = Math.round(box.minY - MAP_MARGIN);
  const viewW = Math.round(box.maxX - box.minX) + MAP_MARGIN * 2;
  const viewH = Math.round(box.maxY - box.minY) + MAP_MARGIN * 2;
  const svg: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewX + ' ' + viewY + ' ' + viewW + ' ' + viewH + '" width="' + viewW + '" height="' + viewH + '" role="img" aria-label="Decision map">',
    '<defs>',
    '<marker id="arrow-supersede" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#294d3e"/></marker>',
    '<marker id="arrow-reference" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#b6c7ba"/></marker>',
    '</defs>',
  ];
  for (const column of columns) {
    svg.push('<text class="date-label" x="' + column.x + '" y="' + (TOP - 30) + '">' + escapeHtml(column.date) + ' (' + column.count + ')</text>');
  }
  svg.push(...edges);
  for (const entry of placed) svg.push(nodeMarkup(entry, colors, recordHref));
  svg.push('</svg>');
  const body = graph.nodes.length === 0 ? '<p class="empty">No decisions yet.</p>' : svg.join('');

  const html: string[] = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + ' — decision map</title><style>' + MAP_STYLE + CANVAS_STYLE + SHARE_STYLE + '</style></head>',
    '<body>',
    canvasHeaderHTML(title, stats,
      'Solid edges supersede; dashed edges are record references. Grouped by the date each decision was created.'),
    '<main id="viewport" tabindex="0" aria-label="Decision map" aria-describedby="instructions"><div id="world">' + body + '</div>',
    canvasDockHTML(
      // The legend quotes the marks the map draws, so each entry waits for the
      // edge or the marker it points at to exist.
      [
        graph.supersedeEdges.length === 0 ? '' : '<span><i class="swatch"></i> superseded by</span>',
        graph.referenceEdges.length === 0 ? '' : '<span><i class="swatch ref"></i> references</span>',
        deliberated === 0 ? '' : '<span><i class="swatch delib"></i> has deliberation tree</span>',
      ].filter(Boolean).join(''),
      'Fit map'),
    '</main>',
    '<script>' + CANVAS_SCRIPT + SHARE_SCRIPT + '</script>',
    '</body></html>',
    '',
  ];
  return html.join('\n');
}
