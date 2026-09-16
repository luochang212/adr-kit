import { requireRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { buildDecisionGraph, dotGraph, mermaidGraph, textTree } from '../core/graph.js';

export interface GraphFormatFlags {
  mermaid?: boolean;
  dot?: boolean;
  text?: boolean;
  formalOnly?: boolean;
  tag?: string;
}

export function graphCommand(cwd: string, flags: GraphFormatFlags): string {
  const formats = (['mermaid', 'dot', 'text'] as const).filter((format) => flags[format]);
  if (formats.length > 1) {
    throw new Error(
      `--${formats.join(' and --')} are mutually exclusive; pick one output format`,
    );
  }
  const root = requireRoot(cwd);
  const graph = buildDecisionGraph(listRecords(root), {
    formalOnly: flags.formalOnly,
    tag: flags.tag,
  });
  if (formats[0] === 'dot') return dotGraph(graph);
  if (formats[0] === 'text') return textTree(graph);
  return mermaidGraph(graph);
}
