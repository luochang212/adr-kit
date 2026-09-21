import { section } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import {
  parseDeliberation,
  renderDeliberationHtml,
  renderDeliberationMermaid,
  renderDeliberationText,
} from '../core/deliberation.js';
import { resolveRecord } from '../core/repository.js';

/** Render a record's optional `## Deliberation` design tree. */
export function treeCommand(query: string, cwd: string, format: 'html' | 'mermaid' | 'text'): string {
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
