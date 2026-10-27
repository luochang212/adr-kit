import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { folderPath, readRecord, removeRecord, resolveProposed, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';
import { formatIssues, validateRecord } from '../core/validate.js';

export function rejectCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const proposal = resolveProposed(root, query);
  if (reason.trim().length === 0) {
    throw new Error('reject requires a non-empty --reason');
  }
  const issues = validateRecord(root, proposal);
  if (issues.length > 0) {
    throw new Error(`proposal is not ready to reject:\n${formatIssues(issues)}`);
  }
  const target = join(folderPath(root, 'rejected'), proposal.fileName);
  if (existsSync(target)) throw new Error(`rejected record already exists: adr/rejected/${proposal.fileName}`);
  const content = stampLifecycleMove(readRecord(proposal), {
    status: 'rejected',
    date: todayStamp(),
    reason: reason.trim(),
  });
  writeRecord(root, 'rejected', proposal.fileName, content);
  try {
    removeRecord(proposal);
  } catch (error) {
    // Roll the staged rejection back so the move never half-happens; the
    // proposal is untouched and the command can be run again. Roll back only
    // bytes this call staged: a concurrent move may have staged its own
    // record under the same name after ours.
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
