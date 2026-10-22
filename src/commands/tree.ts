import { section } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import {
  parseDeliberation,
  renderDeliberationHtml,
  renderDeliberationMermaid,
  renderDeliberationText,
} from '../core/deliberation.js';
import { resolveRecord } from '../core/repository.js';

/** Internal renderer for `atlas --record`; not a CLI command. */
export interface TreeFormatFlags {
  mermaid?: boolean;
  text?: boolean;
  html?: boolean;
}

/** Render a record's optional `## Deliberation` design tree. */
export function treeCommand(query: string, cwd: string, flags: TreeFormatFlags = {}): string {
  // Mirror `graph`: a second format flag is a mistake, not a hint to pick one
  // for the caller.
  const formats = (['mermaid', 'text', 'html'] as const).filter((format) => flags[format]);
  if (formats.length > 1) {
    throw new Error(`--${formats.join(' and --')} are mutually exclusive; pick one output format`);
  }
  const format = formats[0] ?? 'text';

  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  const nodes = parseDeliberation(section(record, 'Deliberation'));
  if (nodes.length === 0) {
    throw new Error(`"${record.title}" has no "## Deliberation" tree to render`);
  }
  if (format === 'html') {
    return renderDeliberationHtml(nodes, record.title);
  }
  return format === 'mermaid' ? renderDeliberationMermaid(nodes) : renderDeliberationText(nodes);
}
