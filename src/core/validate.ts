import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  DATE_PATTERN,
  hasMeaningfulBody,
  PROPOSAL_ERA_HEADINGS,
  type AdrRecord,
  type AdrSection,
} from './adr.js';
import { ADR_DIR, CONFIG_FILE, readConfig } from './config.js';
import { listRecords } from './repository.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

const DECISION_REQUIRED = ['Problem', 'Decision', 'Alternatives considered', 'Consequences'];
const PROPOSED_REQUIRED = ['Problem', 'Proposal', 'Alternatives considered', 'Acceptance criteria', 'Risks'];

const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function calendarDateIsValid(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * The parser enforces YYYY-MM-DD when the field exists; this checks calendar
 * validity, presence (the field is required), and the invariant that a record
 * cannot be created after its latest lifecycle date.
 */
function createdIssues(path: string, record: AdrRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const created = record.created;
  if (created === undefined) {
    issues.push({ path, message: 'front matter must include "created"' });
    return issues;
  }
  const match = created.match(DATE_PATTERN);
  if (match === null) return issues;
  if (!calendarDateIsValid(Number(match[1]), Number(match[2]), Number(match[3]))) {
    issues.push({ path, message: 'front matter created contains an invalid calendar date' });
  }
  if (record.date < created) {
    issues.push({ path, message: 'created must not be after the status date' });
  }
  return issues;
}

function tagsIssues(path: string, tags: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (tags.length === 0) {
    issues.push({ path, message: 'tags must not be empty' });
    return issues;
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!TAG_PATTERN.test(tag)) {
      issues.push({ path, message: `tag "${tag}" must be lowercase kebab-case` });
    }
    if (seen.has(tag)) {
      issues.push({ path, message: `duplicate tag "${tag}"` });
    }
    seen.add(tag);
  }
  return issues;
}

/**
 * The parser already enforces the YYYY-MM-DD format, so this only checks
 * calendar validity; the match is never null for a parsed record.
 */
function dateIssue(record: AdrRecord): string | undefined {
  const match = record.date.match(DATE_PATTERN);
  if (match === null) return undefined;
  if (!calendarDateIsValid(Number(match[1]), Number(match[2]), Number(match[3]))) {
    return 'front matter date contains an invalid calendar date';
  }
  return undefined;
}

/** Required-section, meaningful-body, and duplicate-section checks for all records. */
function sectionIssues(
  path: string,
  sections: AdrSection[],
  required: readonly string[],
  meaningful: readonly string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const headings = new Set(sections.map((section) => section.heading));
  for (const heading of required) {
    if (!headings.has(heading)) {
      issues.push({ path, message: `missing required section "## ${heading}"` });
    }
  }
  for (const heading of meaningful) {
    const body = sections.find((section) => section.heading === heading)?.body;
    if (!hasMeaningfulBody(body)) {
      issues.push({ path, message: `section "## ${heading}" must contain written content` });
    }
  }
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.heading)) {
      issues.push({ path, message: `duplicate section "## ${section.heading}"` });
    }
    seen.add(section.heading);
  }
  return issues;
}

function alternativesIssue(path: string, sections: AdrSection[]): ValidationIssue[] {
  if (!hasMeaningfulBody(sections.find((section) => section.heading === 'Alternatives considered')?.body)) {
    return [
      {
        path,
        message: 'section "## Alternatives considered" must contain at least one written alternative',
      },
    ];
  }
  return [];
}

export function validateRecord(root: string, record: AdrRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = relative(root, record.path);

  for (const key of record.frontMatterExtras ?? []) {
    issues.push({ path, message: `unknown front matter field "${key}"` });
  }
  if (record.commit !== undefined && !/^[0-9a-f]{7,40}$/.test(record.commit)) {
    issues.push({ path, message: `commit "${record.commit}" is not a git hash` });
  }
  const dateError = dateIssue(record);
  if (dateError !== undefined) issues.push({ path, message: dateError });
  issues.push(...createdIssues(path, record));
  if (record.tags !== undefined) issues.push(...tagsIssues(path, record.tags));

  const numbered = record.folder === 'implemented' || record.folder === 'archived';
  if (numbered) {
    if (!/^[1-9]\d*-[a-z0-9一-鿿-]+\.md$/.test(record.fileName)) {
      issues.push({ path, message: 'implemented file name must be "N-slug.md"' });
    }
    if (record.number === undefined) {
      issues.push({ path, message: 'implemented title must be "# ADR: N <title>"' });
    } else if (!record.fileName.startsWith(`${record.number}-`)) {
      issues.push({ path, message: `file name number must match title number ${record.number}` });
    }
    if (record.raisedBy === undefined) {
      issues.push({ path, message: 'front matter must include "raised-by"' });
    }
    if (record.decidedBy === undefined) {
      issues.push({ path, message: 'front matter must include "decided-by"' });
    }
    if (
      (record.folder === 'implemented' && record.status !== 'implemented') ||
      (record.folder === 'archived' && record.status !== 'implemented' && record.status !== 'superseded')
    ) {
      issues.push({ path, message: `status "${record.status}" is not valid in ${record.folder}/` });
    }
    issues.push(...sectionIssues(path, record.sections, DECISION_REQUIRED, ['Problem', 'Decision']));
    for (const heading of PROPOSAL_ERA_HEADINGS) {
      if (record.sections.some((section) => section.heading === heading)) {
        issues.push({ path, message: `implemented record must not contain proposal-era section "## ${heading}"` });
      }
    }
  } else {
    const match = record.fileName.match(/^(\d{4})-(\d{2})-(\d{2})-[a-z0-9一-鿿-]+\.md$/);
    if (match === null) {
      issues.push({ path, message: 'proposal file name must be "YYYY-MM-DD-slug.md"' });
    } else if (!calendarDateIsValid(Number(match[1]), Number(match[2]), Number(match[3]))) {
      issues.push({ path, message: 'file name contains an invalid calendar date' });
    }
    if (record.number !== undefined) {
      issues.push({ path, message: 'unshipped records must not have an ADR number' });
    }
    if (record.raisedBy !== undefined) {
      issues.push({ path, message: 'unshipped records must not include "raised-by"' });
    }
    if (record.decidedBy !== undefined) {
      issues.push({ path, message: 'unshipped records must not include "decided-by"' });
    }
    if (record.status !== record.folder) {
      issues.push({ path, message: `status "${record.status}" must match ${record.folder}/` });
    }
    const required = record.folder === 'rejected'
      ? ['Problem', 'Proposal', 'Alternatives considered']
      : PROPOSED_REQUIRED;
    issues.push(...sectionIssues(path, record.sections, required, ['Problem', 'Proposal']));
  }

  if (record.status === 'superseded') {
    if (record.supersededBy === undefined) {
      issues.push({ path, message: 'superseded status must reference a decision number' });
    } else if (record.supersededBy === record.number) {
      issues.push({ path, message: 'a decision cannot supersede itself' });
    }
  }
  if (record.folder === 'archived') {
    if (record.archived === undefined) {
      issues.push({ path, message: 'archived record must include "archived"' });
    }
    if (record.archiveReason === undefined) {
      issues.push({ path, message: 'archived record must include "archive-reason"' });
    }
    if (record.archived !== undefined) {
      const match = record.archived.match(DATE_PATTERN);
      if (match !== null && !calendarDateIsValid(Number(match[1]), Number(match[2]), Number(match[3]))) {
        issues.push({ path, message: 'archived contains an invalid calendar date' });
      }
      if (record.archived !== record.date) {
        issues.push({ path, message: 'archived date must match the latest lifecycle date' });
      }
      if (record.archived < record.created! || record.archived < record.date) {
        issues.push({ path, message: 'archived date must not precede creation or lifecycle date' });
      }
    }
  } else if (record.archived !== undefined || record.archiveReason !== undefined) {
    issues.push({ path, message: 'archive metadata is only allowed in archived/' });
  }

  issues.push(...alternativesIssue(path, record.sections));
  return issues;
}

export function validateProposal(root: string, record: AdrRecord): ValidationIssue[] {
  return validateRecord(root, record);
}

export function validateRepository(root: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const configFile = join(root, ADR_DIR, CONFIG_FILE);
  if (!existsSync(configFile)) {
    issues.push({ path: `${ADR_DIR}/${CONFIG_FILE}`, message: 'missing config file' });
  } else {
    try {
      readConfig(root);
    } catch (error) {
      issues.push({
        path: `${ADR_DIR}/${CONFIG_FILE}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let records: AdrRecord[];
  try {
    records = listRecords(root);
  } catch (error) {
    issues.push({
      path: ADR_DIR,
      message: error instanceof Error ? error.message : String(error),
    });
    return issues;
  }

  const decisionRecords = new Map<number, AdrRecord>();
  for (const record of records) {
    issues.push(...validateRecord(root, record));
    if (record.number !== undefined) {
      if (decisionRecords.has(record.number)) {
        issues.push({
          path: relative(root, record.path),
          message: `duplicate decision number ${record.number}`,
        });
      }
      decisionRecords.set(record.number, record);
    }
  }

  for (const record of records) {
    issues.push(...supersedeReferenceIssues(root, record, decisionRecords));
    issues.push(...danglingReferenceIssues(relative(root, record.path), record, decisionRecords));
  }

  return issues;
}

function supersedeReferenceIssues(
  root: string,
  record: AdrRecord,
  decisions: Map<number, AdrRecord>,
): ValidationIssue[] {
  if (record.supersededBy === undefined) return [];
  const path = relative(root, record.path);
  const visited = new Set<number>();
  if (record.number !== undefined) visited.add(record.number);
  let next: number | undefined = record.supersededBy;
  while (next !== undefined) {
    if (visited.has(next)) {
      return [{ path, message: `supersession chain contains a cycle at decision ${next}` }];
    }
    visited.add(next);
    const target = decisions.get(next);
    if (target === undefined) {
      return [{ path, message: `"superseded-by: ${next}" references a missing decision` }];
    }
    if (target.status === 'implemented') return [];
    if (target.status !== 'superseded') {
      return [{ path, message: `supersession chain must end at an implemented decision; decision ${next} has status "${target.status}"` }];
    }
    // Parsed superseded records always have a successor; retain the guard for
    // callers supplying AdrRecord values directly.
    if (target.supersededBy === undefined) {
      return [{ path, message: `superseded decision ${next} has no superseded-by reference` }];
    }
    next = target.supersededBy;
  }
  return [];
}

/**
 * Repository-level checks for a single record: a `superseded-by: N` reference
 * must follow existing records without cycles to an implemented decision.
 * validateRecord only sees one file; this adds the cross-record half so
 * `adrkit validate <name>` keeps the same promise as a full validate.
 */
export function validateRecordReferences(
  root: string,
  record: AdrRecord,
  records: AdrRecord[],
): ValidationIssue[] {
  const decisions = new Map<number, AdrRecord>();
  for (const candidate of records) {
    if (candidate.number !== undefined) {
      decisions.set(candidate.number, candidate);
    }
  }
  return [
    ...supersedeReferenceIssues(root, record, decisions),
    ...danglingReferenceIssues(relative(root, record.path), record, decisions),
  ];
}

/**
 * A record body may name other decisions. `adrkit graph` mines those
 * references but silently drops the ones that resolve to nothing, so this
 * reports a reference to a decision number that does not exist. The record's
 * own number is not a reference, and the title line is not scanned because it
 * is not a section.
 */
function danglingReferenceIssues(
  path: string,
  record: AdrRecord,
  decisions: Map<number, AdrRecord>,
): ValidationIssue[] {
  // The same prose vocabulary `adrkit graph` mines: `ADR-12`, `ADR 4`, `ADR12`.
  const pattern = /ADR-?\s*([1-9]\d*)/g;
  const numbers = new Set<number>();
  for (const section of record.sections) {
    const text = `${section.heading}\n${section.body}`;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      numbers.add(Number(match[1]));
    }
  }
  const issues: ValidationIssue[] = [];
  for (const number of [...numbers].sort((a, b) => a - b)) {
    if (number === record.number || decisions.has(number)) continue;
    issues.push({ path, message: `body references decision ${number}, which does not exist` });
  }
  return issues;
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'OK';
  const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
  return `found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
