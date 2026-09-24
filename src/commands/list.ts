import { installedWithNotice, readConfigSafe, requireRoot, withNotice } from '../core/config.js';
import { displayName, listRecords, relativePath } from '../core/repository.js';
import { VERSION } from '../version.js';

export function listCommand(cwd: string): string {
  const root = requireRoot(cwd);
  const config = readConfigSafe(root);
  const notice = config === undefined ? undefined : installedWithNotice(config, VERSION);
  const records = listRecords(root);
  if (records.length === 0) {
    return withNotice(
      'no ADRs yet: start one with "adrkit propose <title>" or "adrkit record <title> --raised-by human --decided-by human"',
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
  return withNotice(lines.join('\n').trimEnd(), notice);
}
