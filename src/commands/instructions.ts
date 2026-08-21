import { findRoot } from '../core/config.js';
import { listDrafts, listRecords } from '../core/repository.js';
import { formatIssues, validateDraft, validateRepository } from '../core/validate.js';

export function instructionsCommand(cwd: string, asJson = false): string {
  const root = findRoot(cwd);
  if (root === undefined) {
    const output = [
      'No ADR Kit repository found.',
      '',
      'Next:',
      '  adrkit init',
      '  adrkit decide "your first decision"',
    ].join('\n');
    return asJson
      ? JSON.stringify({ step: 'init', message: output }, null, 2)
      : output;
  }

  // Pending drafts come first: promoting or discarding them is the steer, and a
  // draft elsewhere in the repo must not hide the proposals that are ready.
  // A corrupt durable record falls back to the repository-level validation
  // output, which reports the parse error as an issue.
  try {
    listRecords(root);
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

  const drafts = listDrafts(root);
  if (drafts.length > 0) {
    const ready: string[] = [];
    const needsWork: Record<string, string[]> = {};
    for (const draft of drafts) {
      const issues = validateDraft(root, draft);
      if (issues.length === 0) {
        ready.push(draft.fileName);
      } else {
        needsWork[draft.fileName] = issues.map((issue) => issue.message);
      }
    }
    const readySet = new Set(ready);

    const lines = [`${drafts.length} draft${drafts.length === 1 ? '' : 's'} pending:`];
    for (const draft of drafts) {
      if (readySet.has(draft.fileName)) {
        lines.push(`  ✓ ${draft.fileName}   validated - ready to accept`);
      } else {
        const first = needsWork[draft.fileName]?.[0] ?? 'validation failed';
        lines.push(`  ✗ ${draft.fileName}   ${first}`);
      }
    }
    lines.push('', 'Next:');
    for (const name of ready) {
      lines.push(`  adrkit accept ${name}   # promote to a decision`);
    }
    for (const name of Object.keys(needsWork)) {
      lines.push(`  adrkit reject ${name}   # or fix adr/.drafts/${name} and accept it`);
    }
    const output = lines.join('\n');
    return asJson
      ? JSON.stringify(
          {
            step: 'decide',
            pending: drafts.map((draft) => draft.fileName),
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
    '  adrkit propose "a decision you are unsure about"   # ephemeral draft',
    '  adrkit decide "an already-made decision"',
  ].join('\n');
  return asJson
    ? JSON.stringify({ step: 'propose', message: output }, null, 2)
    : output;
}
