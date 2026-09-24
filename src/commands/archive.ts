import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { folderPath, readRecord, removeRecord, resolveRecord, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';

export function archiveCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'implemented' || record.status !== 'implemented') {
    throw new Error(`"${query}" must be an implemented decision`);
  }
  if (reason.trim().length === 0) throw new Error('archive requires a non-empty --reason');
  if (record.frontMatterExtras?.length) {
    throw new Error(`"${query}" has unknown front matter field(s): ${record.frontMatterExtras.join(', ')}`);
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
  }
  const content = stampLifecycleMove(readRecord(record), {
    date: todayStamp(),
    archived: todayStamp(),
    'archive-reason': reason.trim(),
  });
  writeRecord(root, 'archived', record.fileName, content);
  removeRecord(record);
  return `archived adr/implemented/${record.fileName} as adr/archived/${record.fileName}`;
}
