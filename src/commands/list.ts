import { requireRoot } from '../core/config.js';
import { displayName, listRecords, relativePath } from '../core/repository.js';

export function listCommand(cwd: string, asJson = false): string {
  const root = requireRoot(cwd);
  const records = listRecords(root);

  if (asJson) {
    const payload = records.map((record) => ({
      folder: record.folder,
      status: record.status,
      number: record.number,
      title: record.title,
      fileName: record.fileName,
      path: relativePath(root, record),
      rejectionReason: record.rejectionReason,
      supersededBy: record.supersededBy,
    }));
    return JSON.stringify(payload, null, 2);
  }

  if (records.length === 0) {
    return 'no ADRs yet — start one with "openadr propose <title>" or "openadr decide <title>"';
  }

  const labels: Record<string, string> = {
    decisions: 'Accepted',
    proposed: 'Proposed',
    rejected: 'Rejected',
  };
  const lines: string[] = [];
  for (const folder of ['decisions', 'proposed', 'rejected'] as const) {
    const group = records.filter((record) => record.folder === folder);
    if (group.length === 0) continue;
    lines.push(labels[folder] ?? folder, '');
    for (const record of group) {
      const supersededNote = record.status === 'superseded' && record.supersededBy !== undefined
        ? `  [superseded by ${String(record.supersededBy).padStart(4, '0')}]`
        : '';
      lines.push(`  ${displayName(record)}${supersededNote}  (${relativePath(root, record)})`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}
