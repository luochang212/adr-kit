import { ADR_DIR, CONFIG_FILE, findRoot, installedWithNotice, joinNotices, readConfigSafe, withNotice } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { formatIssues, validateRecord, validateRecordReferences, validateRepository } from '../core/validate.js';
import { unshapedNotesLine } from '../core/notes.js';
import { standingOrdersDriftNote } from '../core/tool-integrations.js';
import { VERSION } from '../version.js';

// The one-line purpose anchor for the check-in moment: an agent glancing at
// this output re-binds adr/ to the drift and forgetting it exists to block.
const PURPOSE_LINE =
  "adr/ is this repository's memory against drift and forgetting: read it at task start, record when a choice settles.";

export function instructionsCommand(cwd: string): string {
  const root = findRoot(cwd);
  if (root === undefined) {
    return 'No ADR Kit repository found.\n\nNext:\n  adrkit init';
  }
  const config = readConfigSafe(root);
  const notice = joinNotices([
    config === undefined ? undefined : installedWithNotice(config, VERSION),
    standingOrdersDriftNote(root),
  ]);
  const issues = validateRepository(root);
  // Every reachable output of this command opens with the purpose anchor, not
  // only the happy paths: an agent fixing issues needs the same re-binding.
  const validationIssues = () =>
    withNotice(`${PURPOSE_LINE}\n\nThe repository has validation issues.\n\n${formatIssues(issues)}\n\nNext:\n  adrkit validate`, notice);
  const notes = unshapedNotesLine(root);
  let records;
  try {
    records = listRecords(root);
  } catch {
    return validationIssues();
  }
  const proposed = records.filter((record) => record.folder === 'proposed');
  if (issues.some((issue) => issue.path === `${ADR_DIR}/${CONFIG_FILE}`)) {
    return validationIssues();
  }
  if (proposed.length > 0) {
    const lines = [
      PURPOSE_LINE,
      '',
      `${proposed.length} proposal${proposed.length === 1 ? '' : 's'} pending:`,
    ];
    const ready: string[] = [];
    for (const record of proposed) {
      const recordIssues = [...validateRecord(root, record), ...validateRecordReferences(root, record, records)];
      if (recordIssues.length === 0) ready.push(record.fileName);
      lines.push(`  ${recordIssues.length === 0 ? '✓' : '✗'} ${record.fileName}   ${recordIssues.length === 0 ? 'validated - ready after shipping' : recordIssues[0]!.message}`);
    }
    if (notes.length > 0) lines.push('', notes);
    if (issues.length > 0) lines.push('', 'Repository validation issues:', formatIssues(issues));
    lines.push('', 'Next:');
    for (const name of ready) {
      lines.push(`  adrkit implement ${name} --raised-by <human|agent> --decided-by <human|agent>   # after shipping`);
      lines.push(`  adrkit reject ${name} --reason <reason>   # if declined`);
    }
    if (issues.length > 0) lines.push('  adrkit validate   # resolve the reported repository issues');
    return withNotice(lines.join('\n'), notice);
  }
  if (issues.length > 0) {
    return validationIssues();
  }
  return withNotice(`${PURPOSE_LINE}\n\nNo proposals waiting.${notes.length > 0 ? `\n\n${notes}` : ''}\n\nNext:\n  adrkit propose "an unshipped choice"\n  adrkit record "an already-shipped choice" --raised-by <human|agent> --decided-by <human|agent>`, notice);
}
