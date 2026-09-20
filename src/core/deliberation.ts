/**
 * The optional ## Deliberation appendix: a grilling session's design tree,
 * stored as a nested Markdown list so it stays diffable and readable, and
 * rendered to text, mermaid, or a single HTML document on demand. The stored
 * outline is the source of truth; every renderer is a view.
 *
 * Grammar (ADR 5, extended by ADR 6):
 *
 *   - [Q: | A: ]<text>[ [status]][ (round N)][ (recommended)][ em-dash <reason>]
 *
 * Q:/A: marks a question or an option (inferred when omitted: a node with
 * children is a question, a leaf is an option, the top level is the root).
 * [settled], [rejected], [open] is the state. (round N) is the frontier round
 * in which the session settled the node; options inherit their question's
 * round. (recommended) marks the option the agent recommended. The em-dash
 * reason explains the node.
 */

export type DeliberationStatus = 'settled' | 'rejected' | 'open';
export type DeliberationType = 'question' | 'option';

export interface DeliberationNode {
  text: string;
  type?: DeliberationType;
  status?: DeliberationStatus;
  round?: number;
  recommended?: boolean;
  reason?: string;
  children: DeliberationNode[];
}

interface ParsedNode {
  text: string;
  type?: DeliberationType;
  status?: DeliberationStatus;
  round?: number;
  recommended?: boolean;
  reason?: string;
}

const BULLET = /^(\s*)-\s+(.*?)\s*$/;
const STATUS = /\[(settled|rejected|open)\]/i;
const RECOMMENDED = /\(recommended\)\s*$/i;
const ROUND = /\(round\s+([1-9]\d*)\)\s*$/i;
const TYPE = /^([QA]):\s+/i;

/** Parse one bullet from the end inward, so a reason never hides the status. */
function parseNodeText(raw: string): ParsedNode | undefined {
  let content = raw;
  let reason: string | undefined;
  const cut = Math.max(content.lastIndexOf(' \u2014 '), content.lastIndexOf(' - '));
  if (cut !== -1) {
    reason = content.slice(cut + 3).trim();
    content = content.slice(0, cut).trimEnd();
  }
  let recommended: boolean | undefined;
  if (RECOMMENDED.test(content)) {
    recommended = true;
    content = content.replace(RECOMMENDED, '').trimEnd();
  }
  let round: number | undefined;
  const roundMatch = content.match(ROUND);
  if (roundMatch !== null) {
    round = Number(roundMatch[1]);
    content = content.replace(ROUND, '').trimEnd();
  }
  let status: DeliberationStatus | undefined;
  const statusMatch = content.match(STATUS);
  if (statusMatch !== null && statusMatch.index !== undefined) {
    status = statusMatch[1]!.toLowerCase() as DeliberationStatus;
    content = (content.slice(0, statusMatch.index) + content.slice(statusMatch.index + statusMatch[0].length)).trim();
  }
  let type: DeliberationType | undefined;
  const typeMatch = content.match(TYPE);
  if (typeMatch !== null) {
    type = typeMatch[1]!.toUpperCase() === 'Q' ? 'question' : 'option';
    content = content.slice(typeMatch[0].length).trim();
  }
  const text = content.trim();
  if (text.length === 0) return undefined;
  const node: ParsedNode = { text };
  if (type !== undefined) node.type = type;
  if (status !== undefined) node.status = status;
  if (round !== undefined) node.round = round;
  if (recommended !== undefined) node.recommended = recommended;
  if (reason !== undefined && reason.length > 0) node.reason = reason;
  return node;
}

export function parseDeliberation(body: string | undefined): DeliberationNode[] {
  if (body === undefined) return [];
  const roots: DeliberationNode[] = [];
  const stack: Array<{ indent: number; node: DeliberationNode }> = [];
  for (const raw of body.split(/\r?\n/)) {
    const match = raw.match(BULLET);
    if (match === null) continue;
    const indent = match[1]!.replace(/\t/g, '  ').length;
    const parsed = parseNodeText(match[2]!);
    if (parsed === undefined) continue;
    const node: DeliberationNode = { text: parsed.text, children: [] };
    if (parsed.type !== undefined) node.type = parsed.type;
    if (parsed.status !== undefined) node.status = parsed.status;
    if (parsed.round !== undefined) node.round = parsed.round;
    if (parsed.recommended !== undefined) node.recommended = parsed.recommended;
    if (parsed.reason !== undefined) node.reason = parsed.reason;
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent === undefined) roots.push(node);
    else parent.node.children.push(node);
    stack.push({ indent, node });
  }
  propagateRounds(roots, undefined);
  return roots;
}

/** Options inherit the round of their parent question. */
function propagateRounds(nodes: DeliberationNode[], inherited: number | undefined): void {
  for (const node of nodes) {
    if (node.round === undefined && inherited !== undefined) node.round = inherited;
    propagateRounds(node.children, node.round ?? inherited);
  }
}

/** Explicit Q:/A:, else children decide. */
function typeOf(node: DeliberationNode): DeliberationType {
  if (node.type !== undefined) return node.type;
  return node.children.length > 0 ? 'question' : 'option';
}

/**
 * A question whose answer (its settled child) is not the option the agent
 * recommended. Unknown unless both a settled child and a recommended child
 * exist.
 */
function isOverride(node: DeliberationNode): boolean {
  const settled = node.children.filter((child) => child.status === 'settled');
  const recommended = node.children.filter((child) => child.recommended === true);
  if (settled.length === 0 || recommended.length === 0) return false;
  return !settled.some((child) => child.recommended === true);
}

function markers(node: DeliberationNode): string {
  const parts: string[] = [];
  if (node.status !== undefined) parts.push('[' + node.status + ']');
  if (node.round !== undefined && typeOf(node) === 'question') parts.push('(round ' + node.round + ')');
  if (node.recommended === true) parts.push('(recommended)');
  if (isOverride(node)) parts.push('(override)');
  if (node.reason !== undefined) parts.push('\u2014 ' + node.reason);
  return parts.join(' ');
}

export function renderDeliberationText(nodes: DeliberationNode[]): string {
  const lines: string[] = [];
  const walk = (list: DeliberationNode[], depth: number): void => {
    for (const node of list) {
      const prefix = depth === 0 && node.type === undefined ? '' : (typeOf(node) === 'question' ? 'Q: ' : 'A: ');
      const suffix = markers(node);
      lines.push('  '.repeat(depth) + '- ' + prefix + node.text + (suffix.length > 0 ? ' ' + suffix : ''));
      walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return lines.join('\n');
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, "'");
}

interface MermaidEntry {
  id: string;
  node: DeliberationNode;
  parentId?: string;
  isRoot: boolean;
}

export function renderDeliberationMermaid(nodes: DeliberationNode[]): string {
  const entries: MermaidEntry[] = [];
  let counter = 0;
  const collect = (list: DeliberationNode[], parentId: string | undefined, depth: number): void => {
    for (const node of list) {
      const id = 'n' + (++counter);
      const entry: MermaidEntry = { id, node, isRoot: depth === 0 && node.type === undefined };
      if (parentId !== undefined) entry.parentId = parentId;
      entries.push(entry);
      collect(node.children, id, depth + 1);
    }
  };
  collect(nodes, undefined, 0);

  const lines: string[] = ['graph TD'];
  const labelOf = (node: DeliberationNode): string =>
    escapeLabel(node.reason === undefined ? node.text : node.text + ' \u2014 ' + node.reason);
  const nodeLine = (entry: MermaidEntry, indent: string): void => {
    const label = labelOf(entry.node);
    const shape = entry.isRoot
      ? '(["' + label + '"])'
      : (typeOf(entry.node) === 'question' ? '{{"' + label + '"}}' : '["' + label + '"]');
    lines.push(indent + entry.id + shape);
  };

  const rounds = [...new Set(entries.map((entry) => entry.node.round).filter((round): round is number => round !== undefined))].sort((a, b) => a - b);
  if (rounds.length === 0) {
    for (const entry of entries) nodeLine(entry, '  ');
  } else {
    for (const entry of entries) if (entry.isRoot && entry.node.round === undefined) nodeLine(entry, '  ');
    for (const round of rounds) {
      lines.push('  subgraph r' + round + '["Round ' + round + '"]');
      for (const entry of entries) if (entry.node.round === round) nodeLine(entry, '    ');
      lines.push('  end');
    }
    for (const entry of entries) if (!entry.isRoot && entry.node.round === undefined) nodeLine(entry, '  ');
  }
  for (const entry of entries) {
    if (entry.parentId !== undefined) lines.push('  ' + entry.parentId + ' --> ' + entry.id);
  }

  const byStatus: Record<DeliberationStatus, string[]> = { settled: [], rejected: [], open: [] };
  const recommended: string[] = [];
  const overridden: string[] = [];
  for (const entry of entries) {
    if (entry.node.status !== undefined) byStatus[entry.node.status].push(entry.id);
    if (entry.node.recommended === true) recommended.push(entry.id);
    if (isOverride(entry.node)) overridden.push(entry.id);
  }
  lines.push(
    '  classDef settled fill:#dcfce7,stroke:#16a34a;',
    '  classDef rejected fill:#fee2e2,stroke:#dc2626;',
    '  classDef open fill:#fef9c3,stroke:#ca8a04;',
    '  classDef recommended stroke-width:3px;',
    '  classDef override stroke:#7c3aed,stroke-width:2px,stroke-dasharray:4 2;',
  );
  for (const status of ['settled', 'rejected', 'open'] as const) {
    if (byStatus[status].length > 0) lines.push('  class ' + byStatus[status].join(',') + ' ' + status + ';');
  }
  if (recommended.length > 0) lines.push('  class ' + recommended.join(',') + ' recommended;');
  if (overridden.length > 0) lines.push('  class ' + overridden.join(',') + ' override;');
  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderDeliberationHtml(nodes: DeliberationNode[], title: string): string {
  const diagram = escapeHtml(renderDeliberationMermaid(nodes));
  const heading = escapeHtml(title) + ' \u2014 deliberation tree';
  return '<!doctype html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + heading + '</title>\n' +
    '<style>\n' +
    '  body { margin: 2rem; font-family: system-ui, -apple-system, sans-serif; color: #111; }\n' +
    '  h1 { font-size: 1.1rem; font-weight: 600; }\n' +
    '  .mermaid { max-width: 100%; }\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<h1>' + heading + '</h1>\n' +
    '<pre class="mermaid">\n' +
    diagram + '\n' +
    '</pre>\n' +
    '<script type="module">\n' +
    "import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';\n" +
    'mermaid.initialize({ startOnLoad: true });\n' +
    '</script>\n' +
    '</body>\n' +
    '</html>\n';
}
