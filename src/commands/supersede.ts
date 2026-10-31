import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayStamp } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { formatIssues, validateRecord } from '../core/validate.js';
import { citationsTo } from '../core/markers.js';
import { retireRecord } from '../core/retire.js';
import { folderPath, resolveRecord } from '../core/repository.js';

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
  if (replacement.status !== 'implemented' || replacement.folder !== 'implemented') {
    throw new Error(`"--by ${byQuery}" must be an implemented decision`);
  }
  if (replacement.number === undefined) {
    throw new Error(`"--by ${byQuery}" has no decision number`);
  }

  if (record.status !== 'implemented' || record.folder !== 'implemented') {
    throw new Error(`"${query}" must be an implemented decision`);
  }
  // Numbers are assigned in creation order, so the record making a choice
  // obsolete is always the later one. Accepting a lower number would write a
  // permanently backwards `superseded-by` that no validation rejects.
  if (record.number !== undefined && replacement.number <= record.number) {
    throw new Error(
      `"--by ${byQuery}" is decision ${replacement.number}, which is older than decision ${record.number}; ` +
        'a decision is superseded by a later one',
    );
  }
  if (existsSync(join(folderPath(root, 'archived'), record.fileName))) {
    throw new Error(`archived record already exists: adr/archived/${record.fileName}`);
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
  const recordIssues = validateRecord(root, record);
  if (recordIssues.length > 0) {
    throw new Error(`"${query}" is not valid; fix it before superseding:\n${formatIssues(recordIssues)}`);
  }
  // Retirement strands every `@adr N` naming the old decision, and validation
  // rejects a citation to a superseded record. Refuse before the move so the
  // repository cannot fail the next validate because of a command that
  // reported success.
  if (record.number !== undefined) {
    const citing = citationsTo(root, record.number);
    if (citing.length > 0) {
      throw new Error(
        `"${query}" is cited in code; repoint these citations to ADR ${replacement.number} ` +
          `or remove them before superseding:\n` +
          citing.map((site) => `  ${site.path}:${site.line}`).join('\n'),
      );
    }
  }
  // Same one-stamp rule as archive: the two fields describe one moment.
  const stamp = todayStamp();
  const patch: Record<string, string | number> = {
    status: 'superseded',
    date: stamp,
    'superseded-by': replacement.number,
    archived: stamp,
    'archive-reason': `superseded by ADR ${replacement.number}`,
  };
  retireRecord(root, record, patch);
  return `superseded adr/implemented/${record.fileName} by adr/implemented/${replacement.fileName}; archived the old record`;
}
