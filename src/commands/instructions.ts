import { findRoot, installedWithNotice, readConfigSafe, withNotice } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { formatIssues, validateRecord, validateRepository } from '../core/validate.js';
import { VERSION } from '../version.js';

export function instructionsCommand(cwd: string): string {
  const root = findRoot(cwd);
  if (root === undefined) {
    return 'No ADR Kit repository found.\n\nNext:\n  adrkit init';
  }
  const config = readConfigSafe(root);
  const notice = config === undefined ? undefined : installedWithNotice(config, VERSION);
  const issues = validateRepository(root);
  let records;
  try {
    records = listRecords(root);
  } catch {
    return withNotice(`The repository has validation issues.\n\n${formatIssues(issues)}\n\nNext:\n  adrkit validate`, notice);
  }
  const proposed = records.filter((record) => record.folder === 'proposed');
  if (proposed.length > 0) {
    const lines = [`${proposed.length} proposal${proposed.length === 1 ? '' : 's'} pending:`];
    const ready: string[] = [];
    for (const record of proposed) {
      const recordIssues = validateRecord(root, record);
      if (recordIssues.length === 0) ready.push(record.fileName);
      lines.push(`  ${recordIssues.length === 0 ? '✓' : '✗'} ${record.fileName}   ${recordIssues.length === 0 ? 'validated - ready after shipping' : recordIssues[0]!.message}`);
    }
    lines.push('', 'Next:');
    for (const name of ready) {
      lines.push(`  adrkit implement ${name} --raised-by <human|agent> --decided-by <human|agent>   # after shipping`);
      lines.push(`  adrkit reject ${name} --reason <reason>   # if declined`);
    }
    if (ready.length < proposed.length) lines.push('  adrkit validate   # fix incomplete proposals first');
    return withNotice(lines.join('\n'), notice);
  }
  if (issues.length > 0) {
    return withNotice(`The repository has validation issues.\n\n${formatIssues(issues)}\n\nNext:\n  adrkit validate`, notice);
  }
  return withNotice('No proposals waiting.\n\nNext:\n  adrkit propose "an unshipped choice"\n  adrkit record "an already-shipped choice" --raised-by <human|agent> --decided-by <human|agent>', notice);
}
