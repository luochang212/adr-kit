import { RELATION_STYLE, RELATION_SCRIPT } from './relation-focus.js';
import { FAVICON_DATA_URI } from './brand.js';
import type { DecisionGraph, GraphNode } from './graph.js';
import { MAP_STYLE } from './graph-view.js';
import { CANVAS_STYLE, CANVAS_SCRIPT, canvasHeaderHTML, canvasDockHTML } from './canvas-view.js';
import { SHARE_SCRIPT, SHARE_STYLE } from './share.js';
import { escapeHtml, wrapText } from './view-text.js';

// @adr 9, 11 — the offline decision map and the canvas contract it shares
// with the deliberation tree.
const CARD_W = 248;
const PAD_X = 16;
const PAD_Y = 14;
const META_H = 16;
const TITLE_H = 18;
const GAP = 6;
const LINE_CHARS = 30;
const COL_GAP = 96;
const NODE_GAP = 22;
const TOP = 72;
const LEFT = 28;
const BOTTOM = 30;

/** Drawing-box margin: room for strokes and arrowheads. */
const MAP_MARGIN = 16;

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
      const height = PAD_Y * 2 + META_H + GAP + lines.length * TITLE_H;
      placed.push({ node, x, y, height, lines });
      y += height + NODE_GAP;
    }
    bottom = Math.max(bottom, y - NODE_GAP);
    x += CARD_W + COL_GAP;
  }
  const width = columns.length === 0 ? 320 : x - COL_GAP + LEFT;
  return { placed, columns, width, height: bottom + BOTTOM };
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

/** Facing sides for cross-date links; same-date links loop beside the column. */
function edgeSides(from: Placed, to: Placed): [number, number] {
  return from.x === to.x ? [1, 1] : from.x < to.x ? [1, -1] : [-1, 1];
}

function edgeCurve(from: Placed, to: Placed, sourceY: number, targetY: number, lane: number): EdgeCurve {
  const [sourceSide, targetSide] = edgeSides(from, to);
  const sx = from.x + (sourceSide === 1 ? CARD_W : 0);
  const tx = to.x + (targetSide === 1 ? CARD_W : 0);
  const sy = sourceY, ty = targetY;
  // Bounded lanes keep same-date loops in the column gutter. Endpoints are
  // distributed separately, so dense columns do not stack all arrowheads.
  const bend = from.x === to.x ? 32 + (lane % 5) * 12 : Math.max(32, Math.abs(tx - sx) * 0.4);
  const c1x = sx + sourceSide * bend;
  const c2x = tx + targetSide * bend;
  const x = cubicSpan(sx, c1x, c2x, tx);
  const y = cubicSpan(sy, sy, ty, ty);
  return {
    d: 'M' + sx + ',' + sy + ' C' + c1x + ',' + sy + ' ' + c2x + ',' + ty + ' ' + tx + ',' + ty,
    minX: x.min, maxX: x.max, minY: y.min, maxY: y.max,
  };
}

function nodeMarkup(
  placed: Placed,
  recordHref: (recordPath: string) => string,
  nodeId: ((number: number) => string) | undefined,
  labels: DecisionMapLabels,
): string {
  const { node, x, y, height, lines } = placed;
  const classes = ['node'];
  if (node.archived) classes.push('superseded');
  if (node.hasDeliberation) classes.push('has-deliberation');
  const stroke = node.archived ? '#c2cabf' : '#0e7490';
  const metaY = y + PAD_Y + META_H - 5;
  const titleY = y + PAD_Y + META_H + GAP + TITLE_H - 6;
  const parts: string[] = [];
  parts.push('<a href="' + escapeHtml(recordHref(node.path)) + '">');
  const id = nodeId?.(node.number);
  parts.push('<g' + (id === undefined ? '' : ' id="' + escapeHtml(id) + '"') + ' class="' + classes.join(' ') + '" data-adr="' + node.number + '" data-has-deliberation="' + String(node.hasDeliberation) + '">');
  if (node.description) parts.push('<title>' + escapeHtml(node.description) + '</title>');
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + CARD_W + '" height="' + height + '" rx="12" stroke="' + stroke + '"/>');
  parts.push('<text class="num" x="' + (x + PAD_X) + '" y="' + metaY + '">#' + node.number + '</text>');
  const meta = node.archived
    ? (node.supersededBy === undefined ? labels.archived : labels.supersededBy(node.supersededBy))
    : node.created;
  parts.push('<text class="meta" x="' + (x + CARD_W - PAD_X) + '" y="' + metaY + '" text-anchor="end">' + escapeHtml(meta) + '</text>');
  lines.forEach((line, index) => {
    parts.push('<text class="title" x="' + (x + PAD_X) + '" y="' + (titleY + index * TITLE_H) + '">' + escapeHtml(line) + '</text>');
  });
  parts.push('</g>');
  parts.push('</a>');
  return parts.join('');
}

/**
 * The drawing's own words. The standalone map leaves them English; the
 * decision atlas passes the page language, because these strings are generated
 * after the template's static chrome has been translated.
 */
export interface DecisionMapLabels {
  ariaLabel: string;
  archived: string;
  supersededBy: (number: number) => string;
}

const DEFAULT_LABELS: DecisionMapLabels = {
  ariaLabel: 'Decision map',
  archived: 'archived',
  supersededBy: (number) => 'superseded by ' + number,
};

export interface DecisionMapSvgOptions {
  /** Resolve a record path to the link its node points at. */
  recordHref?: (recordPath: string) => string;
  /** Text appended to a creation-date column, usually its record count. */
  dateCount?: (count: number) => string;
  /** Optional DOM id for a node group, so an in-page link can target it. */
  nodeId?: (number: number) => string;
  /** Lifecycle wording; defaults to English for the standalone map. */
  labels?: DecisionMapLabels;
}

export interface DecisionMapDrawing {
  /** The standalone `<svg>` element; an empty graph still returns a frame. */
  svg: string;
  /** Counts the page header reports, in display order. */
  stats: Array<[string, number]>;
}

/**
 * Draw the map once, for callers that embed it in a larger page as well as for
 * the standalone HTML below. The layout is computed here, at generation time,
 * so the drawing needs no network and no runtime.
 */
export function renderDecisionMapSvg(
  graph: DecisionGraph,
  options: DecisionMapSvgOptions = {},
): DecisionMapDrawing {
  const recordHref = options.recordHref ?? ((recordPath) => recordPath);
  const labels = options.labels ?? DEFAULT_LABELS;
  const { placed, columns, width, height } = layout(graph);
  const byNumber = new Map(placed.map((entry) => [entry.node.number, entry]));
  const edges: string[] = [];
  const routes = [
    ...graph.referenceEdges.map(edge => ({ edge, kind: 'reference' as const })),
    ...graph.supersedeEdges.map(edge => ({ edge, kind: 'supersede' as const })),
  ].flatMap(({ edge, kind }) => {
    const from = byNumber.get(edge.from), to = byNumber.get(edge.to);
    return from && to ? [{ edge, kind, from, to, sourceY: 0, targetY: 0 }] : [];
  });
  type Port = { route: typeof routes[number]; end: 'sourceY' | 'targetY'; node: Placed; other: Placed };
  const ports = new Map<string, Port[]>();
  for (const route of routes) {
    const sides = edgeSides(route.from, route.to);
    for (const [node, other, side, end] of [
      [route.from, route.to, sides[0], 'sourceY'],
      [route.to, route.from, sides[1], 'targetY'],
    ] as const) {
      const key = node.node.number + ':' + side;
      const group = ports.get(key) ?? [];
      group.push({ route, end, node, other });
      ports.set(key, group);
    }
  }
  for (const group of ports.values()) {
    group.sort((a, b) => (a.other.y + a.other.height / 2) - (b.other.y + b.other.height / 2));
    const node = group[0]!.node;
    const step = Math.min(10, (node.height - PAD_Y * 2) / Math.max(1, group.length - 1));
    group.forEach((port, i) => {
      port.route[port.end] = node.y + node.height / 2 + (i - (group.length - 1) / 2) * step;
    });
  }
  const lanes = new Map<number, number>();
  const box = { minX: 0, minY: 0, maxX: width, maxY: height };
  for (const { edge, kind, from, to, sourceY, targetY } of routes) {
    const lane = lanes.get(from.x) ?? 0;
    if (from.x === to.x) lanes.set(from.x, lane + 1);
    const curve = edgeCurve(from, to, sourceY, targetY, lane);
    box.minX = Math.min(box.minX, curve.minX);
    box.maxX = Math.max(box.maxX, curve.maxX);
    box.minY = Math.min(box.minY, curve.minY);
    box.maxY = Math.max(box.maxY, curve.maxY);
    edges.push('<path class="edge ' + kind + '" d="' + curve.d + '" data-from="' + edge.from
      + '" data-to="' + edge.to + '" marker-end="url(#arrow-' + kind + ')"/>');
  }

  const viewX = Math.round(box.minX - MAP_MARGIN);
  const viewY = Math.round(box.minY - MAP_MARGIN);
  const viewW = Math.round(box.maxX - box.minX) + MAP_MARGIN * 2;
  const viewH = Math.round(box.maxY - box.minY) + MAP_MARGIN * 2;
  const svg: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewX + ' ' + viewY + ' ' + viewW + ' ' + viewH + '" width="' + viewW + '" height="' + viewH + '" role="group" aria-label="' + escapeHtml(labels.ariaLabel) + '">',
    '<defs>',
    '<marker id="arrow-supersede" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#294d3e"/></marker>',
    '<marker id="arrow-reference" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#b6c7ba"/></marker>',
    '</defs>',
  ];
  for (const column of columns) {
    // The count lives in the date label by default; a caller that draws its
    // own count column gets the bare date instead of the same number twice.
    const label = options.dateCount === undefined ? column.date + ' (' + column.count + ')' : column.date;
    svg.push('<text class="date-label" x="' + column.x + '" y="' + (TOP - 30) + '">' + escapeHtml(label) + '</text>');
    if (options.dateCount !== undefined) {
      svg.push('<text class="date-count" x="' + (column.x + CARD_W) + '" y="' + (TOP - 30) + '" text-anchor="end">' + escapeHtml(options.dateCount(column.count)) + '</text>');
    }
  }
  svg.push(...edges);
  for (const entry of placed) svg.push(nodeMarkup(entry, recordHref, options.nodeId, labels));
  svg.push('</svg>');

  const deliberated = graph.nodes.filter((node) => node.hasDeliberation).length;
  const stats: Array<[string, number]> = [
    ['decisions', graph.nodes.length],
    ['supersessions', graph.supersedeEdges.length],
    ['references', graph.referenceEdges.length],
    ['deliberation trees', deliberated],
  ];
  return { svg: svg.join(''), stats };
}

/**
 * Render the decision map as one self-contained, offline HTML page. The layout
 * is computed at generation time, so the page needs no network, no CDN, and no
 * runtime; every node links to its record file.
 */
export function renderDecisionMapHtml(
  graph: DecisionGraph,
  title = 'Decision map',
  recordHref: (recordPath: string) => string = (recordPath) => recordPath,
): string {
  const { svg, stats } = renderDecisionMapSvg(graph, { recordHref });
  const deliberated = graph.nodes.filter((node) => node.hasDeliberation).length;
  const body = graph.nodes.length === 0 ? '<p class="empty">No decisions yet.</p>' : svg;

  const html: string[] = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + ' — decision map</title><link rel="icon" type="image/svg+xml" href="' + FAVICON_DATA_URI + '"><style>' + MAP_STYLE + CANVAS_STYLE + SHARE_STYLE + RELATION_STYLE + '</style></head>',
    '<body>',
    canvasHeaderHTML(title, stats,
      'Solid edges supersede; dashed edges are record references. Grouped by creation date. Hover or focus a decision to trace its direct relationships; Escape clears the highlight.'),
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
    '<script>' + CANVAS_SCRIPT + SHARE_SCRIPT + RELATION_SCRIPT + '</script>',
    '</body></html>',
    '',
  ];
  return html.join('\n');
}
