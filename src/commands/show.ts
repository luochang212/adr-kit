import { readFileSync } from 'node:fs';
import { requireRoot } from '../core/config.js';
import { relativePath, resolveRecord } from '../core/repository.js';

export function showCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  const path = relativePath(record);
  const content = readFileSync(record.path, 'utf8');
  return `${path}\n${'='.repeat(path.length)}\n\n${content.trimEnd()}`;
}
