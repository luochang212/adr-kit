import { ADR_DIR, requireRoot } from '../core/config.js';
import { relativePath, resolveRecord, resolveRecordFromInventory } from '../core/repository.js';
import {
  formatIssues,
  listValidationRecords,
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
    let records;
    let inventoryError;
    try {
      records = listValidationRecords(root);
    } catch (error) {
      inventoryError = error instanceof Error ? error.message : String(error);
    }
    const record = records === undefined
      ? resolveRecord(root, query)
      : resolveRecordFromInventory(root, query, records);
    const issues = 'sections' in record ? validateRecord(root, record) : [];
    if (inventoryError !== undefined) {
      // An unparseable active sibling must not hide the requested record.
      issues.push({ path: ADR_DIR, message: inventoryError });
    } else {
      issues.push(...validateRecordReferences(root, record, records ?? []));
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
