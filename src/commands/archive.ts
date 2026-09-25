import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import {
  appendSeal,
  ARCHIVED_DIR,
  driftedSeals,
  MANIFEST_FILE,
  readArchiveManifest,
  sealBytes,
  writeArchiveManifest,
} from '../core/archive-seal.js';
import { ADR_DIR, requireRoot } from '../core/config.js';
import { formatIssues, validateRecord } from '../core/validate.js';
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
  // Seal only a record that validates: the archive is frozen and its seal
  // forbids repairing the bytes, so moving an invalid body in is permanent.
  const recordIssues = validateRecord(root, record);
  if (recordIssues.length > 0) {
    throw new Error(`"${query}" is not valid; fix it before archiving:\n${formatIssues(recordIssues)}`);
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
  }
  // Preflight the manifest before anything moves: archiving appends exactly
  // one seal, so a missing or malformed manifest fails while the record is
  // still safely in implemented/. A duplicate seal would launder changed
  // archived bytes, so it is refused the same way.
  const manifest = readArchiveManifest(root);
  if (manifest === undefined) {
    throw new Error(
      `missing ${ADR_DIR}/${ARCHIVED_DIR}/${MANIFEST_FILE}; the archive manifest must exist before archiving`,
    );
  }
  if (manifest.entries.some((entry) => entry.path === record.fileName)) {
    throw new Error(`the archive manifest already seals adr/archived/${record.fileName}`);
  }
  const drift = driftedSeals(root, manifest);
  if (drift.length > 0) {
    throw new Error(`the archive is inconsistent; fix it before archiving:\n  ${drift.join('\n  ')}`);
  }
  const content = stampLifecycleMove(readRecord(record), {
    date: todayStamp(),
    archived: todayStamp(),
    'archive-reason': reason.trim(),
  });
  writeRecord(root, 'archived', record.fileName, content);
  try {
    writeArchiveManifest(root, appendSeal(manifest, record.fileName, sealBytes(content)));
  } catch (error) {
    // Roll the staged archived file back: the active source must survive a
    // failed seal so the move never half-happens.
    rmSync(join(folderPath(root, 'archived'), record.fileName), { force: true });
    throw error;
  }
  removeRecord(record);
  return `archived adr/implemented/${record.fileName} as adr/archived/${record.fileName} and sealed it in ${ADR_DIR}/${ARCHIVED_DIR}/${MANIFEST_FILE}`;
}
