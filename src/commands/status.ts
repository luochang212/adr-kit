import type { AdrRecord } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { formatIssues, validateRepository } from '../core/validate.js';

export interface StatusResult {
  valid: boolean;
  output: string;
}

export function statusCommand(cwd: string): StatusResult {
  const root = requireRoot(cwd);
  const issues = validateRepository(root);
  let records: AdrRecord[] = [];
  try {
    records = listRecords(root);
  } catch {
    // Validation already reported the parse failure above; keep counts empty.
  }
  const counts = { proposed: 0, implemented: 0, rejected: 0, archived: 0 };
  for (const record of records) {
    counts[record.folder] += 1;
  }

  const lines = ['Lifecycle', ''];
  for (const folder of ['proposed', 'implemented', 'rejected', 'archived'] as const) {
    lines.push(`  ${folder}: ${counts[folder]}`);
  }
  lines.push('');
  lines.push(issues.length === 0 ? 'validation: OK' : `validation: ${formatIssues(issues)}`);
  return { valid: issues.length === 0, output: lines.join('\n') };
}
