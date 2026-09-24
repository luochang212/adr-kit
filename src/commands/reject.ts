import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { folderPath, readRecord, removeRecord, resolveProposed, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';
import { formatIssues, validateProposal } from '../core/validate.js';

export function rejectCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const proposal = resolveProposed(root, query);
  if (reason.trim().length === 0) {
    throw new Error('reject requires a non-empty --reason');
  }
  const issues = validateProposal(root, proposal);
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
  removeRecord(proposal);
  return `rejected adr/proposed/${proposal.fileName} as adr/rejected/${proposal.fileName}`;
}
