import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { buildDecisionGraph, dotGraph, mermaidGraph, textTree } from '../core/graph.js';
import { renderDecisionMapHtml } from '../core/graph-html.js';

export interface GraphFormatFlags {
  mermaid?: boolean;
  dot?: boolean;
  text?: boolean;
  html?: boolean;
  formalOnly?: boolean;
  tag?: string;
  /** Write the output here instead of returning it. */
  out?: string;
}

/**
 * Record links resolve from the file the map is written to: a repository-
 * relative path while the map sits inside the repository, so it can be
 * committed and moved with it, and an absolute `file://` URL once it is written
 * outside, where a relative path could not resolve. Without `--out` the caller
 * is redirecting stdout, which only works for a map written into the repository.
 */
function recordHref(root: string, target: string | undefined): (recordPath: string) => string {
  if (target === undefined) return (recordPath) => recordPath;
  // Both sides go through the real path: a symlinked /tmp on macOS would
  // otherwise read as "outside the repository" for a map written inside it.
  const outDir = realpathSync(dirname(target));
  const rootReal = realpathSync(root);
  const inside = outDir === rootReal || outDir.startsWith(rootReal + sep);
  return (recordPath) => {
    const absolute = realpathSync(resolve(rootReal, recordPath));
    return inside
      ? relative(outDir, absolute).split(sep).join('/')
      : pathToFileURL(absolute).href;
  };
}

export function graphCommand(cwd: string, flags: GraphFormatFlags): string {
  const formats = (['mermaid', 'dot', 'text', 'html'] as const).filter((format) => flags[format]);
  if (formats.length > 1) {
    throw new Error(
      `--${formats.join(' and --')} are mutually exclusive; pick one output format`,
    );
  }
  const root = requireRoot(cwd);
  const target = flags.out === undefined ? undefined : resolve(cwd, flags.out);
  if (target !== undefined && !existsSync(dirname(target))) {
    throw new Error(`--out directory does not exist: ${dirname(target)}`);
  }
  const graph = buildDecisionGraph(listRecords(root), {
    formalOnly: flags.formalOnly,
    tag: flags.tag,
  });
  const output = formats[0] === 'dot' ? dotGraph(graph)
    : formats[0] === 'text' ? textTree(graph)
    : formats[0] === 'html' ? renderDecisionMapHtml(graph, 'Decision map', recordHref(root, target))
    : mermaidGraph(graph);
  if (target === undefined) return output;
  writeFileSync(target, output);
  return `wrote ${target}`;
}
