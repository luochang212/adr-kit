import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { AdrRecord } from './adr.js';
import {
  folderPath,
  readRecord,
  removeRecord,
  writeRecord,
} from './repository.js';
import { stampLifecycleMove } from './templates.js';

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
    rmSync(join(folderPath(root, 'archived'), record.fileName), { force: true });
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `staged adr/archived/${record.fileName}, but removing the implemented source failed: ${detail}`,
      { cause: error },
    );
  }
}
