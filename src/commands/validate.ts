import { ADR_DIR, requireRoot } from '../core/config.js';
import { listRecords, relativePath, resolveRecord } from '../core/repository.js';
import {
  formatIssues,
  recordSealIssues,
  validateRecord,
  validateRecordReferences,
  validateRepository,
  validateRepositoryWithBase,
} from '../core/validate.js';

export interface ValidateResult {
  valid: boolean;
  output: string;
}

export function validateCommand(cwd: string, query?: string, base?: string): ValidateResult {
  const root = requireRoot(cwd);
  // Append-only history is a corpus property: a single record has no entry
  // sequence to compare, so --base is refused instead of silently narrowed.
  if (base !== undefined && query !== undefined && query.trim().length > 0) {
    throw new Error(
      `--base checks the archive's append-only history and requires repository-wide validation; run "adrkit validate --all --base <git-ref>"`,
    );
  }
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
    issues.push(...recordSealIssues(root, record));
    return {
      valid: issues.length === 0,
      output: issues.length === 0
        ? `${relativePath(record)}: OK`
        : formatIssues(issues),
    };
  }

  const issues = base === undefined
    ? validateRepository(root)
    : validateRepositoryWithBase(root, base);
  return {
    valid: issues.length === 0,
    output: issues.length === 0 ? 'OK' : formatIssues(issues),
  };
}
