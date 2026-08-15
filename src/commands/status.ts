import type { AdrRecord } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
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

  const counts = { accepted: 0, proposed: 0, rejected: 0 };
  for (const record of records) {
    if (record.folder === 'decisions') counts.accepted += 1;
    else if (record.folder === 'proposed') counts.proposed += 1;
    else if (record.folder === 'rejected') counts.rejected += 1;
  }

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
  lines.push(`  proposed: ${counts.proposed}`);
  lines.push(`  rejected: ${counts.rejected}`);
  lines.push('');
  lines.push(issues.length === 0 ? 'validation: OK' : `validation: ${formatIssues(issues)}`);
  return { valid: issues.length === 0, output: lines.join('\n') };
}
