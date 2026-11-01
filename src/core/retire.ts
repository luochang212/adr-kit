import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { AdrRecord } from './adr.js';
import { readRegularText } from './files.js';
import {
  folderPath,
  readRecord,
  removeRecord,
  withDecisionLock,
  writeNumberedRecordLocked,
} from './repository.js';
import { isStagedLifecycleMove, stampLifecycleMove } from './templates.js';

// @adr 30 — this module is the retirement boundary that record defines; it
// moves records through Git history without a seal.
/**
 * The one retirement boundary `archive` and `supersede` both move through:
 * stamp the record into archived/ and remove the implemented source, holding
 * the decision number's write lock across both steps so a concurrent move of
 * the same decision can neither stage alongside nor converge onto a live
 * writer's files. If the source cannot be removed, roll the staged archived
 * file back so the move never half-happens. Process death inside the window
 * is the one case rollback cannot cover, so the boundary is convergent
 * instead: a re-run that finds its own staged copy under the lock finishes
 * the move by removing the source, and refuses on bytes no run of this
 * command staged. History is Git's job; there is no second manifest.
 */
export function retireRecord(
  root: string,
  record: AdrRecord,
  patch: Record<string, string | number>,
): void {
  if (record.number === undefined) {
    throw new Error('retirement requires a numbered decision');
  }
  const number = record.number;
  const source = readRecord(record);
  const content = stampLifecycleMove(source, patch);
  withDecisionLock(root, number, () => {
    const stagedPath = join(folderPath(root, 'archived'), record.fileName);
    if (existsSync(stagedPath)) {
      let staged: string | undefined;
      try {
        staged = readRegularText(stagedPath, 'record');
      } catch {
        staged = undefined;
      }
      if (staged !== undefined && isStagedLifecycleMove(source, staged, patch)) {
        removeRecord(record);
        return;
      }
      throw new Error(
        `archived record already exists: adr/archived/${record.fileName}. ` +
        'An interrupted archive or supersede re-run finishes only the copy it staged; ' +
        'these bytes are not that move\'s, so remove the copy you do not want and run again',
      );
    }
    writeNumberedRecordLocked(root, 'archived', record.fileName, content, number);
    try {
      removeRecord(record);
    } catch (error) {
      if (!existsSync(record.path)) {
        // The source is gone: another run of this move completed it, and the
        // staged copy is that move's result, not ours to roll back.
        return;
      }
      // Exclusive archive creation prevents another CLI move replacing this
      // destination. The content check additionally preserves manual edits;
      // byte equality alone would not establish ownership between two moves.
      let rolledBack = true;
      try {
        if (readRegularText(stagedPath, 'record') !== content) rolledBack = false;
      } catch {
        rolledBack = false;
      }
      if (rolledBack) rmSync(stagedPath, { force: true });
      const detail = error instanceof Error ? error.message : String(error);
      const kept = rolledBack
        ? ''
        : ` The staged adr/archived/${record.fileName} was left in place: its bytes no longer match this move.`;
      throw new Error(
        `staged adr/archived/${record.fileName}, but removing the implemented source failed: ${detail}.${kept}`,
        { cause: error },
      );
    }
  });
}
