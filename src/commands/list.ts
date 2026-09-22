import { installedWithNotice, readConfigSafe, requireRoot, withNotice } from '../core/config.js';
import { displayName, listDrafts, listRecords, relativePath } from '../core/repository.js';
import { VERSION } from '../version.js';

export function listCommand(cwd: string): string {
  const root = requireRoot(cwd);
  const config = readConfigSafe(root);
  const notice = config === undefined ? undefined : installedWithNotice(config, VERSION);
  const records = listRecords(root);
  const drafts = listDrafts(root);

  if (records.length === 0 && drafts.length === 0) {
    return withNotice(
      'no ADRs yet: start one with "adrkit decide <title> --raised-by human --decided-by human" or "adrkit propose <title>"',
      notice,
    );
  }

  const lines: string[] = [];
  if (records.length > 0) {
    lines.push('Decisions', '');
    for (const record of records) {
      const supersededNote = record.status === 'superseded' && record.supersededBy !== undefined
        ? `  [superseded by ${record.supersededBy}]`
        : '';
      lines.push(`  ${displayName(record)}${supersededNote}  (${relativePath(record)})`);
    }
    lines.push('');
  }
  if (drafts.length > 0) {
    lines.push('Drafts (pending)', '');
    for (const draft of drafts) {
      lines.push(`  ${draft.title}  (${relativePath(draft)})`);
    }
    lines.push('');
  }
  return withNotice(lines.join('\n').trimEnd(), notice);
}
