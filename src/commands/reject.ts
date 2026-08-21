import { requireRoot } from '../core/config.js';
import { removeRecord, resolveDraft } from '../core/repository.js';

export function rejectCommand(query: string, reason: string | undefined, cwd: string): string {
  const root = requireRoot(cwd);
  const draft = resolveDraft(root, query);
  removeRecord(draft);
  const lines = [`rejected and discarded draft adr/.drafts/${draft.fileName}`];
  if (reason !== undefined && reason.trim().length > 0) {
    lines.push(`reason: ${reason.trim()}`);
  }
  lines.push(
    'No record was created - rejection lives in "Alternatives considered" of the',
    'decision that won, not in a standalone rejected record.',
  );
  return lines.join('\n');
}
