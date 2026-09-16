import { ADR_DIR, requireRoot } from '../core/config.js';
import { listRecords, relativePath, resolveRecord } from '../core/repository.js';
import { formatIssues, validateRecord, validateRecordReferences, validateRepository } from '../core/validate.js';

export interface ValidateResult {
  valid: boolean;
  output: string;
}

export function validateCommand(cwd: string, query?: string): ValidateResult {
  const root = requireRoot(cwd);
  if (query !== undefined && query.trim().length > 0) {
    const record = resolveRecord(root, query);
    const issues = validateRecord(root, record);
    try {
      issues.push(...validateRecordReferences(root, record, listRecords(root)));
    } catch (error) {
      // An unparseable sibling must not crash single-record validation;
      // report it like the repository-wide check does.
      issues.push({
        path: ADR_DIR,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      valid: issues.length === 0,
      output: issues.length === 0
        ? `${relativePath(record)}: OK`
        : formatIssues(issues),
    };
  }

  const issues = validateRepository(root);
  return {
    valid: issues.length === 0,
    output: issues.length === 0 ? 'OK' : formatIssues(issues),
  };
}
