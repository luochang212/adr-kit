import { installedWithNotice, readConfigSafe, requireRoot, withNotice } from '../core/config.js';
import { displayName, relativePath } from '../core/repository.js';
import { relevantRecords, type RelevantMatch } from '../core/relevant.js';
import { VERSION } from '../version.js';

/** The reading posture each group carries, so the output teaches the contract. */
const GROUP_HINTS = {
  implemented: 'current authority — read in full',
  proposed: 'intent — check before building on it',
  rejected: 'anti-patterns — the bad cases they warn against',
} as const;

export function relevantCommand(paths: readonly string[], cwd: string): string {
  const root = requireRoot(cwd);
  const config = readConfigSafe(root);
  const notice = config === undefined ? undefined : installedWithNotice(config, VERSION);
  const result = relevantRecords(root, paths, cwd);

  const groups: Array<[string, RelevantMatch[]]> = [
    ['Implemented', result.implemented],
    ['Proposed', result.proposed],
    ['Rejected', result.rejected],
  ];

  const lines: string[] = [];
  for (const [label, matches] of groups) {
    if (matches.length === 0) continue;
    lines.push(`${label} — ${GROUP_HINTS[label.toLowerCase() as keyof typeof GROUP_HINTS]}`, '');
    for (const { record, pattern } of matches) {
      lines.push(`  ${displayName(record)}  [${pattern}]  (${relativePath(record)})`);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    return withNotice(
      `no records scope ${paths.join(', ')}: only records with a paths: field can match, and\n` +
        'scope retrieval is not full-text search — fall back to reading titles and prose.',
      notice,
    );
  }
  return withNotice(
    `${lines.join('\n').trimEnd()}\n\nArchived records are frozen history and are not searched by default.`,
    notice,
  );
}
