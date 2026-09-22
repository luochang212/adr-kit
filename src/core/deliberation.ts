import { renderCardTree } from './deliberation-html.js';
import { wrapText } from './view-text.js';

/**
 * The optional ## Deliberation appendix: a grilling session's design tree,
 * stored as a nested Markdown list so it stays diffable and readable, and
 * rendered to text, mermaid, or a single HTML document on demand. The stored
 * outline is the source of truth; every renderer is a view.
 *
 * Grammar (ADR 5):
 *
 *   - [Q: | A: ]<text>[ [status]][ (recommended)][ em-dash <reason>]
 *
 * Q:/A: marks a question or an option (inferred when omitted: a node with
 * children is a question, a leaf is an option, the top level is the root).
 * [settled], [rejected], [open] is the state. (recommended) marks the option
 * the agent recommended. The em-dash reason explains the node.
 *
 * Dependency is nesting (ADR 7): a follow-up question is a child of the node
 * whose settlement raised it, so related questions run deeper and unrelated
 * ones stay flat. Nothing stores a round; depth is the frontier.
 */

export type DeliberationStatus = 'settled' | 'rejected' | 'open';
export type DeliberationType = 'question' | 'option';

export interface DeliberationNode {
  text: string;
  type?: DeliberationType;
  status?: DeliberationStatus;
  recommended?: boolean;
  reason?: string;
  children: DeliberationNode[];
}

interface ParsedNode {
  text: string;
  type?: DeliberationType;
  status?: DeliberationStatus;
  recommended?: boolean;
  reason?: string;
}

const BULLET = /^(\s*)-\s+(.*?)\s*$/;
const STATUS = /\[(settled|rejected|open)\]\s*(?:\([^)]*\)\s*)*$/i;
const RECOMMENDED = /\(recommended\)\s*$/i;
const TYPE = /^([QA]):\s+/i;
const EM_DASH = ' \u2014 ';

/**
 * Split the node text from its ` — reason`. The em dash with surrounding spaces
 * is the only separator the grammar reserves, which leaves a hyphen free for
 * prose. The first separator starts the reason, so a reason that itself contains
 * ` — ` stays whole instead of swallowing text into the split.
 */
function splitReason(raw: string): { content: string; reason?: string } {
  const emDash = raw.indexOf(EM_DASH);
  if (emDash === -1) return { content: raw };
  return { content: raw.slice(0, emDash).trimEnd(), reason: raw.slice(emDash + EM_DASH.length).trim() };
}

/**
 * Parse one bullet in grammar order: the reason on the first separator, then a
 * trailing `(recommended)`, then a trailing `[status]`. Only the trailing
 * position is a marker, so a bracketed state word inside prose stays text.
 */
function parseNodeText(raw: string): ParsedNode | undefined {
  const split = splitReason(raw);
  let content = split.content;
  const reason = split.reason;
  let recommended: boolean | undefined;
  if (RECOMMENDED.test(content)) {
    recommended = true;
    content = content.replace(RECOMMENDED, '').trimEnd();
  }
  let status: DeliberationStatus | undefined;
  const statusMatch = content.match(STATUS);
  if (statusMatch !== null && statusMatch.index !== undefined) {
    status = statusMatch[1]!.toLowerCase() as DeliberationStatus;
    // Remove only the token: a trailing unknown parenthetical such as a legacy
    // (round N) stays in the text, and the spacing around the removed marker is
    // not otherwise disturbed.
    const token = statusMatch[0].slice(0, statusMatch[0].indexOf(']') + 1);
    content = content.slice(0, statusMatch.index) + content.slice(statusMatch.index + token.length);
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
    if (parsed.recommended !== undefined) node.recommended = parsed.recommended;
    if (parsed.reason !== undefined) node.reason = parsed.reason;
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent === undefined) roots.push(node);
    else parent.node.children.push(node);
    stack.push({ indent, node });
  }
  return roots;
}

/**
 * True when the body parses to at least one node: the same predicate `tree`
 * renders by, so a marker can never promise a tree the command refuses.
 */
export function hasDeliberationTree(body: string | undefined): boolean {
  return parseDeliberation(body).length > 0;
}

/** Explicit Q:/A:, else children decide. */
function typeOf(node: DeliberationNode): DeliberationType {
  if (node.type !== undefined) return node.type;
  return node.children.length > 0 ? 'question' : 'option';
}

/**
 * Whether the node that raised a follow-up question unlocked it. In the outline
 * a question nests under the node it depends on, so that parent is the node
 * that raised it: a settled parent that is not the tree root turns the edge
 * into frontier progress. The card tree, the drawn edges, and Mermaid all ask
 * this one question rather than each deciding for itself.
 */
export function isUnlockedQuestion(
  child: DeliberationNode,
  parent: DeliberationNode,
  parentIsRoot: boolean,
): boolean {
  return typeOf(child) === 'question' && !parentIsRoot && parent.status === 'settled';
}

/**
 * Whether a question took other than the option the agent recommended. Only
 * option children can be an answer: a settled follow-up question is not one, so
 * it never makes a question overridden. The text, Mermaid, and card renderers
 * all read this one predicate so they cannot disagree.
 */
export function isOverride(node: DeliberationNode): boolean {
  const options = node.children.filter((child) => typeOf(child) === 'option');
  const settled = options.filter((child) => child.status === 'settled');
  const recommended = options.filter((child) => child.recommended === true);
  if (settled.length === 0 || recommended.length === 0) return false;
  return !settled.some((child) => child.recommended === true);
}

function markers(node: DeliberationNode): string {
  const parts: string[] = [];
  if (node.status !== undefined) parts.push('[' + node.status + ']');
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

/** Wrap a long label for mermaid's HTML labels. */
function wrapLabel(text: string, width = 48): string {
  return wrapText(text, width).join('<br/>');
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
    wrapLabel(escapeLabel(node.reason === undefined ? node.text : node.text + ' \u2014 ' + node.reason));
  for (const entry of entries) {
    const label = labelOf(entry.node);
    const shape = entry.isRoot
      ? '(["' + label + '"])'
      : (typeOf(entry.node) === 'question' ? '{{"' + label + '"}}' : '["' + label + '"]');
    lines.push('  ' + entry.id + shape);
  }

  // A settled non-root node unlocks its follow-up questions. Unsettled
  // branches retain ordinary edges rather than claiming frontier progress.
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const unlockEdges: number[] = [];
  let edgeIndex = 0;
  for (const entry of entries) {
    if (entry.parentId === undefined) continue;
    const parent = byId.get(entry.parentId)!;
    lines.push('  ' + entry.parentId + ' --> ' + entry.id);
    if (isUnlockedQuestion(entry.node, parent.node, parent.isRoot)) {
      unlockEdges.push(edgeIndex);
    }
    edgeIndex++;
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
  if (unlockEdges.length > 0) lines.push('  linkStyle ' + unlockEdges.join(',') + ' stroke:#7c3aed,stroke-width:3px;');
  return lines.join('\n');
}

/** An offline HTML view; the annotated outline remains the source. */
export function renderDeliberationHtml(nodes: DeliberationNode[], title: string): string {
  return renderCardTree(nodes, title);
}
