import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { ADR_DIR, requireRoot } from '../core/config.js';
import { ARCHIVED_DIR, MANIFEST_FILE } from '../core/archive-seal.js';
import { formatIssues, validateRecord } from '../core/validate.js';
import { sealAndRetire } from '../core/retire.js';
import { folderPath, resolveRecord } from '../core/repository.js';

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
  // Seal only a record that validates: the archive is frozen and its seal
  // forbids repairing the bytes, so moving an invalid body in is permanent.
  const recordIssues = validateRecord(root, record);
  if (recordIssues.length > 0) {
    throw new Error(`"${query}" is not valid; fix it before archiving:\n${formatIssues(recordIssues)}`);
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
  }
  sealAndRetire(
    root,
    record,
    {
      date: todayStamp(),
      archived: todayStamp(),
      'archive-reason': reason.trim(),
    },
    'archiving',
  );
  return `archived adr/implemented/${record.fileName} as adr/archived/${record.fileName} and sealed it in ${ADR_DIR}/${ARCHIVED_DIR}/${MANIFEST_FILE}`;
}
