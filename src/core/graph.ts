import type { AdrRecord } from './adr.js';
import { relativePath } from './repository.js';

/** One decision in the graph; `title` keeps its "N " prefix. */
export interface GraphNode {
  number: number;
  title: string;
  status: AdrRecord['status'];
  /** Current status date (front matter `date`). */
  date: string;
  /** Birth date (front matter `created`); falls back to `date` on legacy records. */
  created: string;
  fileName: string;
  /** Repository-relative POSIX path; the `click` target in Mermaid output. */
  path: string;
  supersededBy?: number;
  /** Mined `ADR-N` reference targets, filtered and sorted. */
  references: number[];
  /** Theme keywords from front matter `tags`. */
  tags: string[];
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

/** The prose cross-reference vocabulary: `ADR-12`, `ADR 4`. */
const REFERENCE_PATTERN = /ADR-?\s*([1-9]\d*)/g;

export function buildDecisionGraph(
  records: AdrRecord[],
  options: { formalOnly?: boolean; tag?: string } = {},
): DecisionGraph {
  const nodes: GraphNode[] = [];
  const recordByNumber = new Map<number, AdrRecord>();
  for (const record of records) {
    if (record.number === undefined) continue;
    recordByNumber.set(record.number, record);
    const node: GraphNode = {
      number: record.number,
      title: record.title,
      status: record.status,
      date: record.date,
      created: record.created ?? record.date,
      fileName: record.fileName,
      path: relativePath(record),
      references: [],
      tags: record.tags ?? [],
    };
    if (record.supersededBy !== undefined) node.supersededBy = record.supersededBy;
    nodes.push(node);
  }

  // Theme filter: keep only decisions carrying the tag; edges survive only
  // when both endpoints survive.
  const filtered = options.tag === undefined
    ? nodes
    : nodes.filter((node) => node.tags.includes(options.tag!));
  const retained = new Set(filtered.map((node) => node.number));

  const supersedeEdges: GraphEdge[] = filtered
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
    for (const node of filtered) {
      const record = recordByNumber.get(node.number)!;
      const body = record.sections.map((section) => section.body).join('\n');
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

  return { nodes: filtered, supersedeEdges, referenceEdges };
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
 * Active nodes are tinted by their first tag (border + text, no fill);
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
    .filter((node) => node.status === 'superseded')
    .map((node) => `n${node.number}`);
  const style: string[] = [];
  if (retired.length > 0) {
    // No fill: retired nodes stay transparent like every other node, so the
    // gray dashed border and gray text are the whole distinction.
    style.push('  classDef retired stroke:#999,stroke-dasharray:4 3,color:#777');
    style.push(`  class ${retired.join(',')} retired`);
  }

  const tagClasses = tagStyleBlocks(graph);
  const clicks = graph.nodes.map((node) => `  click n${node.number} "${node.path}"`);

  const blocks = [header, formal, references, tagClasses, style, clicks, linkStyles].filter(
    (block) => block.length > 0,
  );
  return blocks.map((block) => block.join('\n')).join('\n\n');
}

const TAG_COLORS = [
  '#0e7490',
  '#b45309',
  '#6d28d9',
  '#15803d',
  '#be123c',
  '#4f46e5',
  '#a16207',
  '#0f766e',
];

/** One `classDef tag-N` per distinct tag plus `class` assignments for the
 * nodes carrying it (first tag only, superseded nodes excluded). */
function tagStyleBlocks(graph: DecisionGraph): string[] {
  const tagIndex = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.status === 'superseded') continue;
    const first = node.tags[0];
    if (first === undefined) continue;
    if (!tagIndex.has(first)) tagIndex.set(first, tagIndex.size);
  }
  if (tagIndex.size === 0) return [];
  const defs: string[] = [];
  const assigns = new Map<string, string[]>();
  for (const index of tagIndex.values()) {
    const color = TAG_COLORS[index % TAG_COLORS.length]!;
    defs.push(`  classDef tag-${index} stroke:${color},color:${color}`);
  }
  for (const node of graph.nodes) {
    if (node.status === 'superseded') continue;
    const first = node.tags[0];
    if (first === undefined) continue;
    const index = tagIndex.get(first)!;
    const list = assigns.get(`tag-${index}`);
    if (list === undefined) {
      assigns.set(`tag-${index}`, [`n${node.number}`]);
    } else {
      list.push(`n${node.number}`);
    }
  }
  const lines = [...defs];
  for (const [name, nodes] of assigns) {
    lines.push(`  class ${nodes.join(',')} ${name}`);
  }
  return lines;
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
      if (node.status === 'superseded') {
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

export function jsonGraph(graph: DecisionGraph): string {
  return JSON.stringify(
    {
      decisions: graph.nodes.map((node) => ({
        number: node.number,
        title: node.title,
        status: node.status,
        date: node.date,
        created: node.created,
        fileName: node.fileName,
        path: node.path,
        supersededBy: node.supersededBy,
        references: node.references,
        tags: node.tags,
      })),
      supersedeEdges: graph.supersedeEdges,
      referenceEdges: graph.referenceEdges,
    },
    null,
    2,
  );
}

/**
 * Terminal-friendly tree: birth dates as branches, decisions as leaves,
 * lifecycle and tag annotations inline. The tree shape is the same date
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
      }
      if (node.tags.length > 0) {
        annotations.push(node.tags.join(', '));
      }
      const suffix = annotations.length > 0 ? `  [${annotations.join('; ')}]` : '';
      lines.push(`${groupPad}${isLastNode ? '└── ' : '├── '}${node.title}${suffix}`);
    });
  });
  return lines.join('\n');
}
