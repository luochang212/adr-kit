import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { readRecord, resolveRecord, writeRecord } from '../core/repository.js';
import { stampLifecycleMove } from '../core/templates.js';

export function supersedeCommand(query: string, byQuery: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.status === 'superseded') {
    const current = record.supersededBy ?? 0;
    throw new Error(
      `"${query}" is already superseded by ${current}; supersede that decision instead if it is now outdated`,
    );
  }

  const replacement = resolveRecord(root, byQuery);
  if (replacement.path === record.path) {
    throw new Error('a decision cannot supersede itself');
  }
  if (replacement.status === 'superseded') {
    throw new Error(`"--by ${byQuery}" is itself superseded; choose its currently accepted successor`);
  }
  if (replacement.status !== 'accepted') {
    throw new Error(`"--by ${byQuery}" is not an accepted decision (status "${replacement.status}")`);
  }
  if (replacement.number === undefined) {
    throw new Error(`"--by ${byQuery}" has no decision number`);
  }

  if (record.status !== 'accepted') {
    throw new Error(`unexpected status "${record.status}" in ${record.fileName}`);
  }
  // A lifecycle rewrite emits only the canonical fields, so a key outside the
  // set would disappear silently. Refuse and point at the command that reports
  // it instead of dropping written content.
  const extras = record.frontMatterExtras ?? [];
  if (extras.length > 0) {
    throw new Error(
      `"${query}" has unknown front matter field(s): ${extras.join(', ')}; ` +
        `fix them with "adrkit validate ${record.number ?? query}" before superseding`,
    );
  }
  const original = readRecord(record);
  const patch: Record<string, string | number> = {
    status: 'superseded',
    date: todayStamp(),
    'superseded-by': replacement.number,
  };
  const commit = gitHead(root);
  if (commit !== undefined) patch.commit = commit;
  writeRecord(root, 'decisions', record.fileName, stampLifecycleMove(original, patch));
  return `superseded adr/decisions/${record.fileName} by adr/decisions/${replacement.fileName}`;
}
