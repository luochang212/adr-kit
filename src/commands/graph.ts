import { requireRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { buildDecisionGraph, dotGraph, jsonGraph, mermaidGraph } from '../core/graph.js';

export interface GraphFormatFlags {
  mermaid?: boolean;
  dot?: boolean;
  json?: boolean;
  formalOnly?: boolean;
}

export function graphCommand(cwd: string, flags: GraphFormatFlags): string {
  const formats = (['mermaid', 'dot', 'json'] as const).filter((format) => flags[format]);
  if (formats.length > 1) {
    throw new Error(
      `--${formats.join(' and --')} are mutually exclusive; pick one output format`,
    );
  }
  const root = requireRoot(cwd);
  const graph = buildDecisionGraph(listRecords(root), { formalOnly: flags.formalOnly });
  if (formats[0] === 'dot') return dotGraph(graph);
  if (formats[0] === 'json') return jsonGraph(graph);
  return mermaidGraph(graph);
}
