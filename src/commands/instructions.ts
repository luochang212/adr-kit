import type { AdrRecord } from '../core/adr.js';
import { findRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { formatIssues, validateRecord, validateRepository } from '../core/validate.js';

export function instructionsCommand(cwd: string, asJson = false): string {
  const root = findRoot(cwd);
  if (root === undefined) {
    const output = [
      'No ADR Kit repository found.',
      '',
      'Next:',
      '  adrkit init',
      '  adrkit propose "your first decision"',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'init', message: output }, null, 2)
      : output;
  }

  // Pending proposals come first: deciding them is the steer, and a draft
  // elsewhere in the repo must not hide the proposals that are ready.
  // Unparseable records fall back to the repository-level validation output,
  // which reports the parse error as an issue.
  let records: AdrRecord[];
  try {
    records = listRecords(root);
  } catch {
    const issues = validateRepository(root);
    const output = [
      'The repository has validation issues. Fix them before creating more records.',
      '',
      formatIssues(issues),
      '',
      'Next:',
      '  adrkit validate',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'fix-validation', issues, message: output }, null, 2)
      : output;
  }

  const proposed = records.filter((record) => record.folder === 'proposed');
  if (proposed.length > 0) {
    const ready: string[] = [];
    const needsWork: Record<string, string[]> = {};
    for (const record of proposed) {
      const issues = validateRecord(root, record);
      if (issues.length === 0) {
        ready.push(record.fileName);
      } else {
        needsWork[record.fileName] = issues.map((issue) => issue.message);
      }
    }
    const readySet = new Set(ready);

    const lines = [`${proposed.length} proposal${proposed.length === 1 ? '' : 's'} waiting:`];
    for (const record of proposed) {
      if (readySet.has(record.fileName)) {
        lines.push(`  ✓ ${record.fileName}   validated - ready to accept`);
      } else {
        const first = needsWork[record.fileName]?.[0] ?? 'validation failed';
        lines.push(`  ✗ ${record.fileName}   ${first}`);
      }
    }
    lines.push('', 'Next:');
    for (const name of ready) {
      lines.push(`  adrkit accept ${name}   # accept it`);
    }
    for (const name of Object.keys(needsWork)) {
      lines.push(`  adrkit validate ${name}   # fix it first`);
    }
    const output = lines.join('\n');
    return asJson
      ? JSON.stringify(
          {
            step: 'decide',
            pending: proposed.map((record) => record.fileName),
            readyToAccept: ready,
            needsWork,
            message: output,
          },
          null,
          2,
        )
      : output;
  }

  const issues = validateRepository(root);
  if (issues.length > 0) {
    const output = [
      'The repository has validation issues. Fix them before creating more records.',
      '',
      formatIssues(issues),
      '',
      'Next:',
      '  adrkit validate',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'fix-validation', issues, message: output }, null, 2)
      : output;
  }

  const output = [
    'No proposals waiting.',
    '',
    'Next:',
    '  adrkit propose "your next decision"',
    '  adrkit decide "an already-made decision"',
  ].join('\n');
  return asJson
    ? JSON.stringify({ step: 'propose', message: output }, null, 2)
    : output;
}
