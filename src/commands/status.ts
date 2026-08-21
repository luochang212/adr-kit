import type { AdrRecord } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { listDrafts, listRecords } from '../core/repository.js';
import { formatIssues, validateRepository } from '../core/validate.js';

export interface StatusResult {
  valid: boolean;
  output: string;
}

export function statusCommand(cwd: string, asJson = false): StatusResult {
  const root = requireRoot(cwd);
  const issues = validateRepository(root);
  let records: AdrRecord[] = [];
  try {
    records = listRecords(root);
  } catch {
    // Validation already reported the parse failure above; keep counts empty.
  }
  let drafts: AdrRecord[] = [];
  try {
    drafts = listDrafts(root);
  } catch {
    // A corrupt draft is surfaced by accept/instructions, not by the count.
  }

  const counts = { accepted: 0, superseded: 0, drafts: 0 };
  for (const record of records) {
    if (record.status === 'superseded') counts.superseded += 1;
    else counts.accepted += 1;
  }
  counts.drafts = drafts.length;

  if (asJson) {
    return {
      valid: issues.length === 0,
      output: JSON.stringify(
        {
          valid: issues.length === 0,
          counts,
          issues,
        },
        null,
        2,
      ),
    };
  }

  const lines = ['Lifecycle', ''];
  lines.push(`  accepted: ${counts.accepted}`);
  lines.push(`  superseded: ${counts.superseded}`);
  lines.push(`  drafts (pending): ${counts.drafts}`);
  lines.push('');
  lines.push(issues.length === 0 ? 'validation: OK' : `validation: ${formatIssues(issues)}`);
  return { valid: issues.length === 0, output: lines.join('\n') };
}
