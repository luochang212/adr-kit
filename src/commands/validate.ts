import { requireRoot } from '../core/config.js';
import { relativePath, resolveRecord } from '../core/repository.js';
import { formatIssues, validateRecord, validateRepository } from '../core/validate.js';

export interface ValidateResult {
  valid: boolean;
  output: string;
}

export function validateCommand(cwd: string, query?: string, asJson = false): ValidateResult {
  const root = requireRoot(cwd);
  if (query !== undefined && query.trim().length > 0) {
    const record = resolveRecord(root, query);
    const issues = validateRecord(root, record);
    if (asJson) {
      return {
        valid: issues.length === 0,
        output: JSON.stringify({
          path: relativePath(record),
          valid: issues.length === 0,
          issues,
        }, null, 2),
      };
    }
    return {
      valid: issues.length === 0,
      output: issues.length === 0
        ? `${relativePath(record)}: OK`
        : formatIssues(issues),
    };
  }

  const issues = validateRepository(root);
  if (asJson) {
    return {
      valid: issues.length === 0,
      output: JSON.stringify({ valid: issues.length === 0, issues }, null, 2),
    };
  }
  return {
    valid: issues.length === 0,
    output: issues.length === 0 ? 'OK' : formatIssues(issues),
  };
}
