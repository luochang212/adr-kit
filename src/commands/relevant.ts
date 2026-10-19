import { installedWithNotice, joinNotices, readConfigSafe, requireRoot, withNotice } from '../core/config.js';
import { displayName, relativePath } from '../core/repository.js';
import { relevantRecords, type RelevantMatch } from '../core/relevant.js';
import { standingOrdersDriftNote } from '../core/tool-integrations.js';
import { VERSION } from '../version.js';
import { gitChangedPaths } from '../core/git.js';

/** The reading posture each group carries, so the output teaches the contract. */
const GROUP_HINTS = {
  implemented: 'current authority — read in full',
  proposed: 'intent — check before building on it',
  rejected: 'anti-patterns — the bad cases they warn against',
} as const;

export interface RelevantOptions {
  base?: string;
  staged?: boolean;
}

export function relevantCommand(
  paths: readonly string[], cwd: string, options: RelevantOptions = {},
): { output: string; complete: boolean } {
  const gitInput = options.base !== undefined || options.staged === true;
  if (options.base !== undefined && options.staged) {
    throw new Error('--base and --staged are mutually exclusive');
  }
  if (gitInput && paths.length > 0) {
    throw new Error('Git inputs cannot be combined with explicit paths; choose paths, --base, or --staged');
  }
  if (options.base !== undefined && options.base.trim().length === 0) {
    throw new Error('--base requires a non-empty git ref');
  }
  if (!gitInput && (paths.length === 0 || paths.some((path) => path.trim().length === 0))) {
    throw new Error('relevant requires at least one file or directory path, --base <git-ref>, or --staged');
  }
  const root = requireRoot(cwd);
  const config = readConfigSafe(root);
  const notice = joinNotices([
    config === undefined ? undefined : installedWithNotice(config, VERSION),
    standingOrdersDriftNote(root),
  ]);
  const inputs = gitInput ? gitChangedPaths(root, options) : paths;
  const result = relevantRecords(root, inputs, cwd, gitInput);

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
    lines.push(gitInput && inputs.length === 0
      ? 'no changed paths in the selected Git input; this does not mean no decisions apply.'
      : `no records scope ${gitInput ? 'the changed paths' : paths.join(', ')}: only records with a paths: field can match, and\n` +
        'scope retrieval is not full-text search — fall back to reading titles and prose.');
  }
  if (gitInput) {
    lines.unshift(`Git input: ${options.staged ? 'staged changes only' : `working tree against ${options.base} (including non-ignored untracked files)`}; ${inputs.length} changed path(s).`, '');
  }
  if (result.unscopedCount > 0) {
    lines.push(`\nScope coverage: ${result.unscopedCount} active record(s) have no paths: scope; run "adrkit list" and check them for relevance.`);
  }
  if (result.diagnostics.length > 0) {
    lines.push('\nIncomplete scope search — results are partial:');
    for (const diagnostic of result.diagnostics) lines.push(`  ${diagnostic.path}: ${diagnostic.message}`);
    lines.push('Resolve the diagnostics or pass narrower paths before relying on this result.');
  }
  lines.push('\nScope matches are not exhaustive architectural context; use "adrkit list" and read relevant records in full.',
    'Archived records are frozen history and are not searched by default.');
  return {
    output: withNotice(lines.join('\n').trimEnd(), notice),
    complete: result.diagnostics.length === 0,
  };
}
