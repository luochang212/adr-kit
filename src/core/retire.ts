import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { AdrRecord } from './adr.js';
import {
  folderPath,
  readRecord,
  removeRecord,
  writeRecord,
} from './repository.js';
import { stampLifecycleMove } from './templates.js';

// @adr 30 — this module is the retirement boundary that record defines; it
// moves records through Git history without a seal.
/**
 * The one retirement boundary `archive` and `supersede` both move through:
 * stamp the record into archived/ and remove the implemented source. If the
 * source cannot be removed, roll the staged archived file back so the move
 * never half-happens. History is Git's job; there is no second manifest.
 */
export function retireRecord(
  root: string,
  record: AdrRecord,
  patch: Record<string, string | number>,
): void {
  const content = stampLifecycleMove(readRecord(record), patch);
  writeRecord(root, 'archived', record.fileName, content);
  try {
    removeRecord(record);
  } catch (error) {
    const staged = join(folderPath(root, 'archived'), record.fileName);
    // Roll back only bytes this call staged: a concurrent move may have
    // staged its own record under the same name after ours, and deleting
    // that would lose the only copy of a record.
    let rolledBack = true;
    try {
      if (readFileSync(staged, 'utf8') !== content) rolledBack = false;
    } catch {
      rolledBack = false;
    }
    if (rolledBack) rmSync(staged, { force: true });
    const detail = error instanceof Error ? error.message : String(error);
    const kept = rolledBack
      ? ''
      : ` The staged adr/archived/${record.fileName} was left in place: its bytes no longer match this move.`;
    throw new Error(
      `staged adr/archived/${record.fileName}, but removing the implemented source failed: ${detail}.${kept}`,
      { cause: error },
    );
  }
}
