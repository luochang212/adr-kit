import { findRoot } from '../core/config.js';
import { listRecords } from '../core/repository.js';
import { formatIssues, validateRepository } from '../core/validate.js';

export function instructionsCommand(cwd: string, asJson = false): string {
  const root = findRoot(cwd);
  if (root === undefined) {
    const output = [
      'No OpenADR repository found.',
      '',
      'Next:',
      '  openadr init',
      '  openadr propose "your first decision"',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'init', message: output }, null, 2)
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
      '  openadr validate',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'fix-validation', issues, message: output }, null, 2)
      : output;
  }

  const records = listRecords(root);
  const proposed = records.filter((record) => record.folder === 'proposed');
  if (proposed.length > 0) {
    const names = proposed.map((record) => record.fileName).join(', ');
    const output = [
      `${proposed.length} proposal${proposed.length === 1 ? '' : 's'} waiting for a decision:`,
      `  ${names}`,
      '',
      'Next:',
      '  openadr show <name>',
      '  openadr accept <name>      # accept it',
      '  openadr reject <name> --reason "..."  # reject it',
    ].join('\n');
    return asJson
      ? JSON.stringify(
          { step: 'decide', pending: proposed.map((record) => record.fileName), message: output },
          null,
          2,
        )
      : output;
  }

  const output = [
    'No proposals waiting.',
    '',
    'Next:',
    '  openadr propose "your next decision"',
    '  openadr decide "an already-made decision"',
  ].join('\n');
  return asJson
    ? JSON.stringify({ step: 'propose', message: output }, null, 2)
    : output;
}
