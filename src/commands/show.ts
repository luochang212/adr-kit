import { readFileSync } from 'node:fs';
import { markdownLines } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { relativePath, resolveRecord } from '../core/repository.js';
import { displayWidth } from '../core/view-text.js';

export function showCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  const path = relativePath(record);
  const content = readFileSync(record.path, 'utf8');
  // Keep the original text and line endings; scan only Markdown, not YAML.
  const lines = content.split(/(?<=\n)/);
  const bodyStart = lines.findIndex((line, index) => index > 0 && line.replace(/\r?\n$/, '') === '---') + 1;
  const shown = lines.slice(0, bodyStart);
  let index = bodyStart;
  let deliberation = false;
  for (const line of markdownLines(lines.slice(bodyStart).join(''))) {
    if (!line.code && line.visible.startsWith('## ')) {
      deliberation = line.visible.slice(3).trim() === 'Deliberation';
    }
    if (!deliberation) shown.push(lines[index] ?? '');
    index++;
  }
  // The underline matches the printed width, so a CJK path underlines fully.
  return `${path}\n${'='.repeat(displayWidth(path))}\n\n${shown.join('').trimEnd()}`;
}
