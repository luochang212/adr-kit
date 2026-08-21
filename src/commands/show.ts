import { readFileSync } from 'node:fs';
import { requireRoot } from '../core/config.js';
import { relativePath, resolveDraft, resolveRecord } from '../core/repository.js';

export function showCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  // Decisions first, then ephemeral drafts - `show` doubles as a draft review.
  // If neither resolves, surface the decisions-oriented error rather than the
  // draft fallback's, so a mistyped number still says "no ADR matches".
  let record;
  try {
    record = resolveRecord(root, query);
  } catch (decisionError) {
    try {
      record = resolveDraft(root, query);
    } catch {
      throw decisionError;
    }
  }
  const path = relativePath(record);
  const content = readFileSync(record.path, 'utf8');
  return `${path}\n${'='.repeat(path.length)}\n\n${content.trimEnd()}`;
}
