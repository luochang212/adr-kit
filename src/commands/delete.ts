import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdrRecord } from '../core/adr.js';
import { ADR_DIR, requireRoot } from '../core/config.js';
import { citationsTo, findCitations } from '../core/markers.js';
import {
  journalRemovedDecisionNumber,
  listRecords,
  removeRecord,
  resolveRecord,
  relativePath,
} from '../core/repository.js';
import { proseReferenceNumbers, recordsReferencing } from '../core/validate.js';

// @adr 47 — this command is the checked removal path: deletion is permitted
// only when it strands nothing, extending the retirement refusal pattern to
// removal (ADR 46) under ADR 20's durable-rejection and frozen-archive rules.
/**
 * Remove a record that should never have existed — noise, a duplicate, a
 * routine change recorded as a decision. This is neither a lifecycle stage
 * nor a retirement: `reject` and `archive` keep their meanings. The command
 * refuses while code cites the record or another record references it, so
 * `adrkit validate` passes after every successful deletion. Git history
 * retains the removed bytes, as it retains every archived record (ADR 30).
 */
export function deleteCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder === 'archived') {
    throw new Error(
      `"${query}" is archived; archived records are frozen history and are never deleted — retire current guidance with "adrkit archive" or "adrkit supersede" instead`,
    );
  }
  if (record.number !== undefined) {
    const citing = citationsTo(root, record.number);
    if (citing.length > 0) {
      throw new Error(
        `"${query}" is cited in code; update these citations before deleting:\n` +
          citing.map((site) => `  ${site.path}:${site.line}`).join('\n'),
      );
    }
    const stranded = recordsReferencing(root, listRecords(root), record.number);
    if (stranded.length > 0) {
      throw new Error(
        `"${query}" is referenced by other records; update them before deleting:\n` +
          stranded.map((site) => `  ${site.path}: ${site.message}`).join('\n'),
      );
    }
  }
  const lines: string[] = [];
  if (record.folder === 'rejected') {
    lines.push(
      'note: a rejection is durable (ADR 20): it leaves only when another record owns the warning it blocks; confirm that warning is preserved before relying on this deletion.',
    );
  }
  // Removal is the one number event that lowers the surviving-file maximum,
  // so it journals before the record leaves the tree: a failed removal after
  // the journal still cannot hand the number onward, and a retry appends a
  // harmless duplicate.
  if (record.number !== undefined) journalRemovedDecisionNumber(root, record.number);
  removeRecord(record);
  lines.push(`deleted ${relativePath(record)}; Git history retains the record`);
  // Mentions in user-owned files are reported, never rewritten: the CLI reads
  // AGENTS.md but does not edit it, and the note buffer belongs to the writer.
  for (const mention of unscannedMentions(root, record)) {
    lines.push(`note: ${mention}`);
  }
  return lines.join('\n');
}

/**
 * Mentions of this decision in the files the reference scan does not cover:
 * AGENTS.md and the note buffer. Only numbered records can be named.
 */
function unscannedMentions(root: string, record: AdrRecord): string[] {
  if (record.number === undefined) return [];
  const mentions: string[] = [];
  const surfaces = [
    ['AGENTS.md', join(root, 'AGENTS.md')],
    [`${ADR_DIR}/notes.md`, join(root, ADR_DIR, 'notes.md')],
  ] as const;
  for (const [label, path] of surfaces) {
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    const cited = findCitations(text).some((citation) => citation.numbers.includes(record.number!));
    const named = proseReferenceNumbers(text).includes(record.number!);
    if (cited || named) {
      mentions.push(`${label} mentions ADR ${record.number}; it is user-owned, so update it by hand`);
    }
  }
  return mentions;
}
