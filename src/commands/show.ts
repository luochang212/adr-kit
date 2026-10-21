import { readFileSync } from 'node:fs';
import { requireRoot } from '../core/config.js';
import { relativePath, resolveRecord, resolveRecordFromInventory } from '../core/repository.js';
import { listValidationRecords } from '../core/validate.js';
import { displayWidth } from '../core/view-text.js';

export function showCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  let record;
  try {
    record = resolveRecordFromInventory(root, query, listValidationRecords(root));
  } catch {
    record = resolveRecord(root, query);
  }
  const path = relativePath(record);
  const content = readFileSync(record.path, 'utf8');
  // The underline matches the printed width, so a CJK path underlines fully.
  return `${path}\n${'='.repeat(displayWidth(path))}\n\n${content.trimEnd()}`;
}
