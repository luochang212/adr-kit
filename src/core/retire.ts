import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  appendSeal,
  ARCHIVED_DIR,
  driftedSeals,
  MANIFEST_FILE,
  readArchiveManifest,
  sealBytes,
  sourceRemovalFailure,
  writeArchiveManifest,
} from './archive-seal.js';
import { ADR_DIR } from './config.js';
import type { AdrRecord } from './adr.js';
import {
  folderPath,
  readRecord,
  removeRecord,
  writeRecord,
} from './repository.js';
import { stampLifecycleMove } from './templates.js';

// @adr 19 — this module is the retirement boundary that record's seal guarantee owns.
/**
 * The one retirement boundary `archive` and `supersede` both move through:
 * preflight the manifest, stage the stamped record in archived/, append its
 * seal, and remove the implemented source. Callers validate the record and
 * check the destination first; this owns everything that can half-happen. A
 * failed seal write rolls the staged file back so the active source survives,
 * and a failed source removal surfaces the recovery diagnostic instead of
 * reporting a half-completed move.
 *
 * It lives in its own module, above repository.ts, so every write and removal
 * goes through an imported binding — the seam the recovery tests inject their
 * failures at — rather than a same-module call a spy cannot reach.
 */
export function sealAndRetire(
  root: string,
  record: AdrRecord,
  patch: Record<string, string | number>,
  verb: 'archiving' | 'superseding',
): void {
  const manifest = readArchiveManifest(root);
  if (manifest === undefined) {
    throw new Error(
      `missing ${ADR_DIR}/${ARCHIVED_DIR}/${MANIFEST_FILE}; the archive manifest must exist before ${verb}`,
    );
  }
  if (manifest.entries.some((entry) => entry.path === record.fileName)) {
    throw new Error(`the archive manifest already seals adr/archived/${record.fileName}`);
  }
  const drift = driftedSeals(root, manifest);
  if (drift.length > 0) {
    throw new Error(`the archive is inconsistent; fix it before ${verb}:\n  ${drift.join('\n  ')}`);
  }
  const content = stampLifecycleMove(readRecord(record), patch);
  writeRecord(root, 'archived', record.fileName, content);
  try {
    writeArchiveManifest(root, appendSeal(manifest, record.fileName, sealBytes(content)));
  } catch (error) {
    // Roll the staged archived file back: the active source must survive a
    // failed seal so the move never half-happens.
    rmSync(join(folderPath(root, 'archived'), record.fileName), { force: true });
    throw error;
  }
  try {
    removeRecord(record);
  } catch (error) {
    throw sourceRemovalFailure(record.path, join(folderPath(root, 'archived'), record.fileName), error);
  }
}
