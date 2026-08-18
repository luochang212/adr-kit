import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireRoot } from '../core/config.js';
import { removeRecord, resolveRecord, writeRecord } from '../core/repository.js';

export function rejectCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'proposed') {
    throw new Error(`"${query}" is not a proposal (it is in ${record.folder})`);
  }
  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    throw new Error('a rejection reason is required: adrkit reject <name> --reason "..."');
  }

  const path = join(root, 'adr', 'rejected', record.fileName);
  if (existsSync(path)) {
    throw new Error(`rejected record already exists: adr/rejected/${record.fileName}`);
  }

  const original = readFileSync(record.path, 'utf8');
  const lines = original.split(/\r?\n/);
  lines[1] = `Status: rejected — ${trimmedReason}`;
  writeRecord(root, 'rejected', record.fileName, lines.join('\n'));
  removeRecord(record);
  return `rejected adr/proposed/${record.fileName} as adr/rejected/${record.fileName}`;
}
