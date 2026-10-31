import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { formatIssues, validateRecord } from '../core/validate.js';
import { citationsTo } from '../core/markers.js';
import { retireRecord } from '../core/retire.js';
import { folderPath, resolveRecord } from '../core/repository.js';

export function archiveCommand(query: string, reason: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'implemented' || record.status !== 'implemented') {
    throw new Error(`"${query}" must be an implemented decision`);
  }
  if (reason.trim().length === 0) throw new Error('archive requires a non-empty --reason');
  if (record.frontMatterExtras?.length) {
    throw new Error(`"${query}" has unknown front matter field(s): ${record.frontMatterExtras.join(', ')}`);
  }
  // The move rewrites the canonical field set, so the active record must
  // already satisfy it or the rewrite would silently drop written content.
  const recordIssues = validateRecord(root, record);
  if (recordIssues.length > 0) {
    throw new Error(`"${query}" is not valid; fix it before archiving:\n${formatIssues(recordIssues)}`);
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
  }
  // The move would strand every `@adr N` naming this decision: validation
  // rejects a citation to an archived record, so the repository would fail
  // `adrkit validate` immediately after this command reported success. Refuse
  // before touching the tree, as `implement` refuses an unready proposal.
  if (record.number !== undefined) {
    const citing = citationsTo(root, record.number);
    if (citing.length > 0) {
      throw new Error(
        `"${query}" is cited in code; update these citations before archiving:\n` +
          citing.map((site) => `  ${site.path}:${site.line}`).join('\n'),
      );
    }
  }
  // One stamp for both fields: a second call can cross midnight and write a
  // record that immediately fails its own "archived matches date" invariant.
  const stamp = todayStamp();
  retireRecord(root, record, {
    date: stamp,
    archived: stamp,
    'archive-reason': reason.trim(),
  });
  return `archived adr/implemented/${record.fileName} as adr/archived/${record.fileName}`;
}
