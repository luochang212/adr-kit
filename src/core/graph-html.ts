import type { DecisionGraph, GraphEdge, GraphNode } from './graph.js';
import { TAG_COLORS } from './graph.js';
import { MAP_STYLE } from './graph-view.js';
import { CANVAS_HINT, CANVAS_SCRIPT, canvasControlsHTML } from './canvas-view.js';

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap a title to a fixed column width on word boundaries. */
function wrap(text: string, width = LINE_CHARS): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current === '') {
      current = word;
    } else if ((current + ' ' + word).length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current + ' ' + word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
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
      const lines = wrap(displayTitle(node));
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

/** A left-to-right cubic curve between a source card's right and a target's left edge. */
function edgePath(from: Placed, to: Placed): string {
  const sx = from.x + CARD_W;
  const sy = from.y + from.height / 2;
  const tx = to.x;
  const ty = to.y + to.height / 2;
  const bend = Math.max(40, Math.abs(tx - sx) * 0.4);
  return 'M' + sx + ',' + sy + ' C' + (sx + bend) + ',' + sy + ' ' + (tx - bend) + ',' + ty + ' ' + tx + ',' + ty;
}

function nodeMarkup(placed: Placed, colors: Map<string, string>): string {
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
  parts.push('<a href="' + escapeHtml(node.path) + '">');
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
  if (node.tags.length > 0 || node.hasDeliberation) {
    const footerY = titleY + (lines.length - 1) * TITLE_H + GAP + FOOTER_H - 2;
    if (node.tags.length > 0) {
      const tags = node.tags.slice(0, 3).map((tag) => '#' + tag).join('  ');
      parts.push('<text class="tag" x="' + (x + PAD_X) + '" y="' + footerY + '">' + escapeHtml(tags) + '</text>');
    }
    if (node.hasDeliberation) {
      parts.push('<text class="badge" x="' + (x + CARD_W - PAD_X) + '" y="' + footerY + '" text-anchor="end">deliberation</text>');
    }
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
export function renderDecisionMapHtml(graph: DecisionGraph, title = 'Decision map'): string {
  const { placed, columns, width, height } = layout(graph);
  const colors = tagColors(placed.map((entry) => entry.node));
  const byNumber = new Map(placed.map((entry) => [entry.node.number, entry]));
  const edges: string[] = [];
  const drawEdge = (edge: GraphEdge, kind: 'supersede' | 'reference'): void => {
    const from = byNumber.get(edge.from);
    const to = byNumber.get(edge.to);
    if (from === undefined || to === undefined) return;
    edges.push('<path class="edge ' + kind + '" d="' + edgePath(from, to) + '" marker-end="url(#arrow-' + kind + ')"/>');
  };
  for (const edge of graph.referenceEdges) drawEdge(edge, 'reference');
  for (const edge of graph.supersedeEdges) drawEdge(edge, 'supersede');

  const deliberated = graph.nodes.filter((node) => node.hasDeliberation).length;
  const stats: Array<[string, number]> = [
    ['decisions', graph.nodes.length],
    ['supersessions', graph.supersedeEdges.length],
    ['references', graph.referenceEdges.length],
    ['deliberated', deliberated],
  ];
  const svg: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="Decision map">',
    '<defs>',
    '<marker id="arrow-supersede" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#294d3e"/></marker>',
    '<marker id="arrow-reference" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#b6c7ba"/></marker>',
    '</defs>',
  ];
  for (const column of columns) {
    svg.push('<text class="date-label" x="' + column.x + '" y="' + (TOP - 30) + '">' + escapeHtml(column.date) + ' (' + column.count + ')</text>');
  }
  svg.push(...edges);
  for (const entry of placed) svg.push(nodeMarkup(entry, colors));
  svg.push('</svg>');
  const body = graph.nodes.length === 0 ? '<p class="empty">No decisions yet.</p>' : svg.join('');

  const html: string[] = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + ' — decision map</title><style>' + MAP_STYLE + '</style></head>',
    '<body>',
    '<header><div class="brand"><span class="logo" aria-hidden="true">↳</span> ADR Kit <small>DECISION MAP</small></div></header>',
    '<section class="intro"><div class="eyebrow">DECISIONS / RELATIONSHIP MAP</div><h1>' + escapeHtml(title) + '</h1>',
    '<p>Solid edges supersede; dashed edges are record references. Grouped by the date each decision was created.</p>',
    '<div class="stats">' + stats.map(([label, value]) => '<div class="stat"><strong>' + value + '</strong>' + label + '</div>').join('') + '</div></section>',
    '<main id="viewport" tabindex="0" aria-label="Decision map" aria-describedby="instructions"><div id="world">' + body + '</div>',
    '<div id="instructions" class="hint">' + CANVAS_HINT + '</div>',
    canvasControlsHTML('Fit map'),
    '</main>',
    '<footer><div class="legend"><span><i class="swatch"></i> superseded by</span><span><i class="swatch ref"></i> references</span><span><i class="swatch delib"></i> has deliberation tree</span></div></footer>',
    '<script>' + CANVAS_SCRIPT + '</script>',
    '</body></html>',
    '',
  ];
  return html.join('\n');
}
