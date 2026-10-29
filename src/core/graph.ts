import type { AdrRecord } from './adr.js';
import { section, visibleRecordText } from './adr.js';
import { hasDeliberationTree } from './deliberation.js';
import { relativePath } from './repository.js';

/** One decision in the graph; `title` keeps its "N " prefix. */
export interface GraphNode {
  number: number;
  title: string;
  status: AdrRecord['status'];
  archived: boolean;
  /** Latest lifecycle date (front matter `date`). */
  date: string;
  /** Birth date (front matter `created`). */
  created: string;
  fileName: string;
  /** Repository-relative POSIX path; the `click` target in Mermaid output. */
  path: string;
  supersededBy?: number;
  /** Mined `ADR-N` reference targets, filtered and sorted. */
  references: number[];
  description: string;
  /** True when the record carries a meaningful `## Deliberation` appendix. */
  hasDeliberation: boolean;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface DecisionGraph {
  nodes: GraphNode[];
  /** One edge per `superseded-by` front matter field. */
  supersedeEdges: GraphEdge[];
  /** Mined `ADR-N` mentions, deduplicated against formal edges. */
  referenceEdges: GraphEdge[];
}

/**
 * The prose cross-reference vocabulary: `ADR-12`, `ADR 4`. A term that merely
 * contains ADR ("MADR-12") does not mine: the lookbehind rejects a letter
 * before the ADR. Title-form
 * references — CJK prose cites records as `ADR「标题」` or `「标题」`, often
 * shortened to a title prefix — do not mine: quoted-span matching needs fuzzy
 * title prefixes, which trades silent completeness for wrong edges in a
 * governance view. Known limitation, parked in adr/notes.md.
 */
const REFERENCE_PATTERN = /(?<![A-Za-z])ADR-?\s*([1-9]\d*)/g;

export function buildDecisionGraph(
  records: AdrRecord[],
  options: { formalOnly?: boolean } = {},
): DecisionGraph {
  const nodes: GraphNode[] = [];
  const recordByNumber = new Map<number, AdrRecord>();
  for (const record of records) {
    if (record.number === undefined) continue;
    // `created` is required by the record format and `validate` rejects a
    // record without it, so the graph reports that record instead of inventing
    // a birth date from `date`.
    if (record.created === undefined) {
      throw new Error(
        `${record.fileName} has no "created" date in its front matter; run "adrkit validate" and fix it before graphing`,
      );
    }
    recordByNumber.set(record.number, record);
    const node: GraphNode = {
      number: record.number,
      title: record.title,
      status: record.status,
      archived: record.folder === 'archived',
      date: record.date,
      created: record.created,
      fileName: record.fileName,
      path: relativePath(record),
      references: [],
      description: record.description ?? '',
      hasDeliberation: hasDeliberationTree(section(record, 'Deliberation')),
    };
    if (record.supersededBy !== undefined) node.supersededBy = record.supersededBy;
    nodes.push(node);
  }
  nodes.sort((first, second) => first.number - second.number);

  const retained = new Set(nodes.map((node) => node.number));

  const supersedeEdges: GraphEdge[] = nodes
    .filter((node) => node.supersededBy !== undefined && retained.has(node.supersededBy!))
    .map((node) => ({ from: node.number, to: node.supersededBy! }))
    .sort(byPair);

  // A mined edge between two records already joined by a formal supersede
  // edge is dropped in either direction: the formal edge already says it.
  const formalPairs = new Set<string>();
  for (const edge of supersedeEdges) {
    formalPairs.add(`${edge.from}-${edge.to}`);
    formalPairs.add(`${edge.to}-${edge.from}`);
  }

  const referenceEdges: GraphEdge[] = [];
  if (!options.formalOnly) {
    for (const node of nodes) {
      const record = recordByNumber.get(node.number)!;
      // Mined edges come from visible prose, the same text validation's
      // dangling-reference check reads: comment-masked and fenced text never
      // becomes an edge.
      const body = visibleRecordText(record);
      const targets = new Set<number>();
      for (const match of body.matchAll(REFERENCE_PATTERN)) {
        const target = Number(match[1]);
        if (target === node.number) continue;
        // Prose may mention proposals or numbers that are not decisions;
        // only references that resolve to a node become edges.
        if (!recordByNumber.has(target)) continue;
        if (formalPairs.has(`${node.number}-${target}`)) continue;
        targets.add(target);
      }
      node.references = [...targets].sort((a, b) => a - b);
      for (const target of node.references) {
        if (retained.has(target)) {
          referenceEdges.push({ from: node.number, to: target });
        }
      }
    }
  }
  referenceEdges.sort(byPair);

  return { nodes, supersedeEdges, referenceEdges };
}

function byPair(a: GraphEdge, b: GraphEdge): number {
  return a.from - b.from || a.to - b.to;
}

/** Distinct birth dates, chronological; YYYY-MM-DD sorts lexically. */
function dateGroups(nodes: GraphNode[]): Map<string, GraphNode[]> {
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const group = groups.get(node.created);
    if (group === undefined) {
      groups.set(node.created, [node]);
    } else {
      group.push(node);
    }
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Mermaid flowchart. Decisions share a subgraph per birth date (`created`)
 * so decision bursts are visible without implying a continuous timeline;
 * edges are solid for formal supersession, dashed for mined references.
 * Active nodes use one accent (border + text, no fill);
 * superseded nodes keep the gray retired style instead.
 */
export function mermaidGraph(graph: DecisionGraph): string {
  const header: string[] = ['flowchart LR'];
  for (const [date, nodes] of dateGroups(graph.nodes)) {
    header.push(`  subgraph D${date.replaceAll('-', '')}["${date} (${nodes.length})"]`);
    header.push('    direction TB');
    for (const node of nodes) {
      header.push(`    n${node.number}["${mermaidLabel(node.title)}"]`);
    }
    header.push('  end');
  }

  const formal = graph.supersedeEdges.map(
    (edge) => `  n${edge.from} ==>|superseded by| n${edge.to}`,
  );
  const references = graph.referenceEdges.map((edge) => `  n${edge.from} -.-> n${edge.to}`);

  // mermaid linkStyle indexes every link in declaration order (formal edges
  // are declared before references), so the k-th formal edge has index k.
  // Override its stroke to long dashes — the decision-graph idiom that keeps
  // a supersession distinct from a mined reference without a heavy stroke.
  const linkStyles = graph.supersedeEdges.map(
    (_, k) => `  linkStyle ${k} stroke-dasharray:11 7`,
  );

  const retired = graph.nodes
    .filter((node) => node.archived)
    .map((node) => `n${node.number}`);
  const style: string[] = [];
  if (retired.length > 0) {
    // No fill: retired nodes stay transparent like every other node, so the
    // gray dashed border and gray text are the whole distinction.
    style.push('  classDef retired stroke:#999,stroke-dasharray:4 3,color:#777');
    style.push(`  class ${retired.join(',')} retired`);
  }

  const active = graph.nodes.filter((node) => !node.archived).map((node) => `n${node.number}`);
  const activeStyle = active.length === 0 ? [] : [
    '  classDef active stroke:#0e7490,color:#0e7490',
    `  class ${active.join(',')} active`,
  ];
  const clicks = graph.nodes.map((node) => `  click n${node.number} "${node.path}"`);

  const blocks = [header, formal, references, activeStyle, style, clicks, linkStyles].filter(
    (block) => block.length > 0,
  );
  return blocks.map((block) => block.join('\n')).join('\n\n');
}

function mermaidLabel(title: string): string {
  return title.replaceAll('"', '#quot;');
}

/** Graphviz digraph with one cluster (and rank) per record date. */
export function dotGraph(graph: DecisionGraph): string {
  const lines: string[] = ['digraph decisions {', '  rankdir=LR;', '  node [shape=box];'];
  for (const [date, nodes] of dateGroups(graph.nodes)) {
    lines.push(`  subgraph cluster_${date.replaceAll('-', '')} {`);
    lines.push(`    label="${date} (${nodes.length})";`);
    lines.push('    {');
    lines.push('      rank=same;');
    for (const node of nodes) {
      const attrs = [`label="${dotLabel(node.title)}"`];
      if (node.archived) {
        // Transparent fill like every node; dashed gray border + gray text
        // mark retirement without making it a colored block among empties.
        attrs.push('style=dashed', 'color="#999999"');
      }
      lines.push(`      n${node.number} [${attrs.join(', ')}];`);
    }
    lines.push('    }');
    lines.push('  }');
  }
  for (const edge of graph.supersedeEdges) {
    lines.push(`  n${edge.from} -> n${edge.to} [label="superseded by"];`);
  }
  for (const edge of graph.referenceEdges) {
    lines.push(`  n${edge.from} -> n${edge.to} [style=dashed];`);
  }
  lines.push('}');
  return lines.join('\n');
}

function dotLabel(title: string): string {
  return title.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

/**
 * Terminal-friendly tree: birth dates as branches, decisions as leaves,
 * lifecycle annotations inline. The tree shape is the same date
 * grouping the graph formats use, drawn with box-drawing characters so it
 * reads in any terminal without a renderer.
 */
export function textTree(graph: DecisionGraph): string {
  const lines: string[] = ['Decisions'];
  const groups = [...dateGroups(graph.nodes).entries()];
  groups.forEach(([date, nodes], groupIndex) => {
    const isLastGroup = groupIndex === groups.length - 1;
    lines.push(`${isLastGroup ? '└── ' : '├── '}${date} (${nodes.length})`);
    const groupPad = isLastGroup ? '    ' : '│   ';
    nodes.forEach((node, nodeIndex) => {
      const isLastNode = nodeIndex === nodes.length - 1;
      const annotations: string[] = [];
      if (node.supersededBy !== undefined) {
        annotations.push(`superseded by ${node.supersededBy}`);
      } else if (node.archived) {
        annotations.push('archived');
      }
      const suffix = annotations.length > 0 ? `  [${annotations.join('; ')}]` : '';
      lines.push(`${groupPad}${isLastNode ? '└── ' : '├── '}${node.title}${suffix}`);
    });
  });
  return lines.join('\n');
}
