import { installedWithNotice, readConfigSafe, requireRoot, withNotice } from '../core/config.js';
import { displayName, listRecords, relativePath } from '../core/repository.js';
import { unshapedNotesLine } from '../core/notes.js';
import { VERSION } from '../version.js';

export function listCommand(cwd: string): string {
  const root = requireRoot(cwd);
  const config = readConfigSafe(root);
  const notice = config === undefined ? undefined : installedWithNotice(config, VERSION);
  const records = listRecords(root);
  const notes = unshapedNotesLine(root);
  if (records.length === 0) {
    return withNotice(
      notes.length > 0
        ? `no ADRs yet, but ${notes}`
        : 'no ADRs yet: start one with "adrkit propose <title>" or "adrkit record <title> --raised-by human --decided-by human"',
      notice,
    );
  }

  const lines: string[] = [];
  for (const folder of ['proposed', 'implemented', 'rejected', 'archived'] as const) {
    const group = records.filter((record) => record.folder === folder);
    if (group.length === 0) continue;
    lines.push(folder[0]!.toUpperCase() + folder.slice(1), '');
    for (const record of group) {
      const supersededNote = record.status === 'superseded' && record.supersededBy !== undefined
        ? `  [superseded by ${record.supersededBy}]`
        : '';
      lines.push(`  ${displayName(record)}${supersededNote}  (${relativePath(record)})`);
    }
    lines.push('');
  }
  if (notes.length > 0) lines.push(notes, '');
  return withNotice(lines.join('\n').trimEnd(), notice);
}
