import { readFileSync } from 'node:fs';
import { requireRoot } from '../core/config.js';
import { resolveRecord, writeRecord } from '../core/repository.js';

export function supersedeCommand(query: string, byQuery: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'decisions') {
    throw new Error(`"${query}" is not an accepted decision (it is in ${record.folder})`);
  }
  if (record.status === 'superseded') {
    const current = String(record.supersededBy ?? 0).padStart(4, '0');
    throw new Error(
      `"${query}" is already superseded by ${current}; supersede that decision instead if it is now outdated`,
    );
  }

  const replacement = resolveRecord(root, byQuery);
  if (replacement.folder !== 'decisions') {
    throw new Error(`"--by ${byQuery}" is not an accepted decision (it is in ${replacement.folder})`);
  }
  if (replacement.path === record.path) {
    throw new Error('a decision cannot supersede itself');
  }
  if (replacement.status === 'superseded') {
    throw new Error(`"--by ${byQuery}" is itself superseded; superseding with it would create a dangling chain`);
  }
  if (replacement.number === undefined) {
    throw new Error(`"--by ${byQuery}" has no decision number`);
  }

  const original = readFileSync(record.path, 'utf8');
  const lines = original.split(/\r?\n/);
  if (lines[1] !== 'Status: accepted') {
    throw new Error(`unexpected status line "${lines[1] ?? ''}" in ${record.fileName}`);
  }
  lines[1] = `Status: superseded by ${String(replacement.number).padStart(4, '0')}`;
  writeRecord(root, 'decisions', record.fileName, lines.join('\n'));
  return `superseded adr/decisions/${record.fileName} by adr/decisions/${replacement.fileName}`;
}
