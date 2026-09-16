import { requireRoot } from '../core/config.js';
import { displayName, listDrafts, listRecords, relativePath } from '../core/repository.js';

export function listCommand(cwd: string, asJson = false): string {
  const root = requireRoot(cwd);
  const records = listRecords(root);
  const drafts = listDrafts(root);

  if (asJson) {
    // --json is the agent-facing surface, and decided-by is part of what an
    // agent needs to know about a record, so it is exposed alongside the
    // other lifecycle fields (absent on drafts, which never carry it).
    const payload = [...records, ...drafts].map((record) => ({
      folder: record.folder,
      status: record.status,
      number: record.number,
      title: record.title,
      fileName: record.fileName,
      path: relativePath(record),
      decidedBy: record.decidedBy,
      rejectionReason: record.rejectionReason,
      supersededBy: record.supersededBy,
    }));
    return JSON.stringify(payload, null, 2);
  }

  if (records.length === 0 && drafts.length === 0) {
    return 'no ADRs yet: start one with "adrkit decide <title> --decided-by human" or "adrkit propose <title>"';
  }

  const lines: string[] = [];
  if (records.length > 0) {
    lines.push('Accepted', '');
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
  return lines.join('\n').trimEnd();
}
