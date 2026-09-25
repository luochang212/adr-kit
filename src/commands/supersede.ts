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
import { requireRoot } from '../core/config.js';
import { formatIssues, validateRecord } from '../core/validate.js';
import { gitHead } from '../core/git.js';
import { folderPath, readRecord, removeRecord, resolveRecord, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';

export function supersedeCommand(query: string, byQuery: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.status === 'superseded') {
    const current = record.supersededBy ?? 0;
    throw new Error(
      `"${query}" is already superseded by ${current}; supersede that decision instead if it is now outdated`,
    );
  }

  const replacement = resolveRecord(root, byQuery);
  if (replacement.path === record.path) {
    throw new Error('a decision cannot supersede itself');
  }
  if (replacement.status !== 'implemented' || replacement.folder !== 'implemented') {
    throw new Error(`"--by ${byQuery}" must be an implemented decision`);
  }
  if (replacement.number === undefined) {
    throw new Error(`"--by ${byQuery}" has no decision number`);
  }

  if (record.status !== 'implemented' || record.folder !== 'implemented') {
    throw new Error(`"${query}" must be an implemented decision`);
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
  }
  // A lifecycle rewrite emits only the canonical fields, so a key outside the
  // set would disappear silently. Refuse and point at the command that reports
  // it instead of dropping written content.
  const extras = record.frontMatterExtras ?? [];
  if (extras.length > 0) {
    throw new Error(
      `"${query}" has unknown front matter field(s): ${extras.join(', ')}; ` +
        `fix them with "adrkit validate ${record.number ?? query}" before superseding`,
    );
  }
  // The retiring record is about to be sealed, so it must validate first.
  const recordIssues = validateRecord(root, record);
  if (recordIssues.length > 0) {
    throw new Error(`"${query}" is not valid; fix it before superseding:\n${formatIssues(recordIssues)}`);
  }
  const original = readRecord(record);
  const patch: Record<string, string | number> = {
    status: 'superseded',
    date: todayStamp(),
    'superseded-by': replacement.number,
    archived: todayStamp(),
    'archive-reason': `superseded by ADR ${replacement.number}`,
  };
  const commit = gitHead(root);
  if (commit !== undefined) patch.commit = commit;
  // Same preflight as archive: the manifest must be readable and must not
  // already seal the retiring file, and both sides are checked before either
  // file moves.
  const manifest = readArchiveManifest(root);
  if (manifest === undefined) {
    throw new Error(
      `missing adr/${ARCHIVED_DIR}/${MANIFEST_FILE}; the archive manifest must exist before superseding`,
    );
  }
  if (manifest.entries.some((entry) => entry.path === record.fileName)) {
    throw new Error(`the archive manifest already seals adr/archived/${record.fileName}`);
  }
  const drift = driftedSeals(root, manifest);
  if (drift.length > 0) {
    throw new Error(`the archive is inconsistent; fix it before superseding:\n  ${drift.join('\n  ')}`);
  }
  const content = stampLifecycleMove(original, patch);
  writeRecord(root, 'archived', record.fileName, content);
  try {
    writeArchiveManifest(root, appendSeal(manifest, record.fileName, sealBytes(content)));
  } catch (error) {
    rmSync(join(folderPath(root, 'archived'), record.fileName), { force: true });
    throw error;
  }
  removeRecord(record);
  return `superseded adr/implemented/${record.fileName} by adr/implemented/${replacement.fileName}; archived old record with a manifest seal`;
}
