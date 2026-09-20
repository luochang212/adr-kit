/**
 * The optional `## Deliberation` appendix: a grilling session's design tree,
 * stored as a nested Markdown list so it stays diffable and readable, and
 * rendered to mermaid or text on demand. Mermaid is never the source of truth.
 */

export type DeliberationStatus = 'settled' | 'rejected' | 'open';

export interface DeliberationNode {
  text: string;
  status?: DeliberationStatus;
  children: DeliberationNode[];
}

const BULLET = /^(\s*)-\s+(.*?)\s*$/;
const STATUS = /\s*\[(settled|rejected|open)\]\s*$/i;

/**
 * Parse the nested list under `## Deliberation`. Indentation defines the
 * tree; a trailing `[settled]`, `[rejected]`, or `[open]` marks a node.
 * Non-bullet lines are commentary and ignored, so a session can interleave
 * prose without breaking the tree.
 */
export function parseDeliberation(body: string | undefined): DeliberationNode[] {
  if (body === undefined) return [];
  const roots: DeliberationNode[] = [];
  const stack: Array<{ indent: number; node: DeliberationNode }> = [];
  for (const raw of body.split(/\r?\n/)) {
    const match = raw.match(BULLET);
    if (match === null) continue;
    const indent = match[1]!.replace(/\t/g, '  ').length;
    let text = match[2]!;
    let status: DeliberationStatus | undefined;
    const statusMatch = text.match(STATUS);
    if (statusMatch !== null && statusMatch.index !== undefined) {
      status = statusMatch[1]!.toLowerCase() as DeliberationStatus;
      text = text.slice(0, statusMatch.index).trim();
    }
    if (text.length === 0) continue;
    const node: DeliberationNode = { text, children: [] };
    if (status !== undefined) node.status = status;
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent === undefined) roots.push(node);
    else parent.node.children.push(node);
    stack.push({ indent, node });
  }
  return roots;
}

export function renderDeliberationText(nodes: DeliberationNode[]): string {
  const lines: string[] = [];
  const walk = (list: DeliberationNode[], depth: number): void => {
    for (const node of list) {
      const suffix = node.status === undefined ? '' : ` [${node.status}]`;
      lines.push(`${'  '.repeat(depth)}- ${node.text}${suffix}`);
      walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return lines.join('\n');
}

export function renderDeliberationMermaid(nodes: DeliberationNode[]): string {
  const lines: string[] = ['graph TD'];
  const byStatus: Record<DeliberationStatus, string[]> = { settled: [], rejected: [], open: [] };
  let counter = 0;
  const walk = (list: DeliberationNode[], parentId: string | undefined): void => {
    for (const node of list) {
      const id = `n${++counter}`;
      lines.push(`  ${id}["${node.text.replace(/"/g, "'")}"]`);
      if (parentId !== undefined) lines.push(`  ${parentId} --> ${id}`);
      if (node.status !== undefined) byStatus[node.status].push(id);
      walk(node.children, id);
    }
  };
  walk(nodes, undefined);
  lines.push(
    '  classDef settled fill:#dcfce7,stroke:#16a34a;',
    '  classDef rejected fill:#fee2e2,stroke:#dc2626;',
    '  classDef open fill:#fef9c3,stroke:#ca8a04;',
  );
  for (const status of ['settled', 'rejected', 'open'] as const) {
    if (byStatus[status].length > 0) lines.push(`  class ${byStatus[status].join(',')} ${status};`);
  }
  return lines.join('\n');
}
