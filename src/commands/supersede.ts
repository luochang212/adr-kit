import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { readRecord, resolveRecord, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';

export function supersedeCommand(query: string, byQuery: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'decisions') {
    throw new Error(`"${query}" is not an accepted decision (it is in ${record.folder})`);
  }
  if (record.status === 'superseded') {
    const current = record.supersededBy ?? 0;
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

  if (record.status !== 'accepted') {
    throw new Error(`unexpected status "${record.status}" in ${record.fileName}`);
  }
  const original = readRecord(record);
  writeRecord(
    root,
    'decisions',
    record.fileName,
    stampLifecycleMove(original, {
      status: 'superseded',
      date: todayStamp(),
      'superseded-by': replacement.number,
    }),
  );
  return `superseded adr/decisions/${record.fileName} by adr/decisions/${replacement.fileName}`;
}
