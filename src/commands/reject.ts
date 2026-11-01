import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { folderPath, readRecord, removeRecord, resolveProposed, writeRecord } from '../core/repository.js';
import { isStagedLifecycleMove, stampLifecycleMove } from '../core/templates.js';
import { formatIssues, validateRecord } from '../core/validate.js';

export function rejectCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const proposal = resolveProposed(root, query);
  if (reason.trim().length === 0) {
    throw new Error('reject requires a non-empty --reason');
  }
  if (proposal.status !== 'proposed') {
    throw new Error('proposal is not ready to reject: status must be "proposed" in proposed/');
  }
  // A rejection needs the rationale it preserves, not an implementation plan
  // for a direction being abandoned. Keep checking the source metadata too,
  // so the lifecycle rewrite cannot silently discard invalid fields.
  const issues = validateRecord(root, {
    ...proposal, folder: 'rejected', status: 'rejected', rejectionReason: reason.trim(),
  });
  if (issues.length > 0) {
    throw new Error(`proposal is not ready to reject:\n${formatIssues(issues)}`);
  }
  const source = readRecord(proposal);
  const patch = {
    status: 'rejected',
    date: todayStamp(),
    reason: reason.trim(),
  };
  const target = join(folderPath(root, 'rejected'), proposal.fileName);
  if (existsSync(target)) {
    // Process death between writing the rejection and removing the proposal
    // is the one window the rollback below cannot cover; converge it the way
    // every lifecycle move does — finish only this move's own staged copy.
    let staged: string | undefined;
    try {
      staged = readFileSync(target, 'utf8');
    } catch {
      staged = undefined;
    }
    if (staged !== undefined && isStagedLifecycleMove(source, staged, patch)) {
      removeRecord(proposal);
      return `resumed an interrupted reject: adr/proposed/${proposal.fileName} had already landed as adr/rejected/${proposal.fileName}; removed the proposal`;
    }
    throw new Error(
      `rejected record already exists: adr/rejected/${proposal.fileName}; ` +
      'an interrupted reject finishes only the copy it staged, so remove the file you do not want and run again',
    );
  }
  const content = stampLifecycleMove(source, patch);
  writeRecord(root, 'rejected', proposal.fileName, content);
  try {
    removeRecord(proposal);
  } catch (error) {
    if (!existsSync(proposal.path)) {
      // The proposal is gone: another run of this rejection completed it, and
      // the staged rejection is that move's result, not ours to roll back.
      return `rejected adr/proposed/${proposal.fileName} as adr/rejected/${proposal.fileName}`;
    }
    // Roll the staged rejection back so the move never half-happens; the
    // proposal is untouched and the command can be run again. Exclusive
    // creation prevents other CLI moves replacing the staged destination;
    // preserve any intervening manual edits when rolling it back.
    try {
      if (readFileSync(target, 'utf8') === content) rmSync(target, { force: true });
    } catch {
      // A file we cannot read back is not ours to delete.
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `staged adr/rejected/${proposal.fileName}, but removing the proposal failed: ${detail}. The proposal is still in adr/proposed/; resolve the error and run reject again`,
      { cause: error },
    );
  }
  return `rejected adr/proposed/${proposal.fileName} as adr/rejected/${proposal.fileName}`;
}
