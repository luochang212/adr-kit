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
 * cannot be created after its current status date.
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

/** Required-section, meaningful-body, and duplicate-section checks, shared by decisions and drafts. */
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

  if (record.status !== 'accepted' && record.status !== 'superseded') {
    const hint =
      record.status === 'rejected'
        ? 'rejection is recorded in a decision\'s "Alternatives considered", not as a standalone status'
        : 'proposals are ephemeral drafts in adr/.drafts/';
    issues.push({
      path,
      message: `status "${record.status}" is not a durable decision status; ${hint}`,
    });
  }

  if (record.commit !== undefined && !/^[0-9a-f]{7,40}$/.test(record.commit)) {
    issues.push({ path, message: `commit "${record.commit}" is not a git hash` });
  }

  if (record.status === 'superseded') {
    if (record.supersededBy === undefined) {
      issues.push({ path, message: 'superseded status must reference a decision number' });
    } else if (record.supersededBy === record.number) {
      issues.push({ path, message: 'a decision cannot supersede itself' });
    }
  }

  const dateError = dateIssue(record);
  if (dateError !== undefined) issues.push({ path, message: dateError });
  issues.push(...createdIssues(path, record));
  if (record.tags !== undefined) issues.push(...tagsIssues(path, record.tags));

  if (!/^[1-9]\d*-[a-z0-9一-鿿-]+\.md$/.test(record.fileName)) {
    issues.push({ path, message: 'decision file name must be "N-slug.md"' });
  }
  if (record.number === undefined) {
    issues.push({ path, message: 'accepted decision title must be "# ADR: N <title>"' });
  } else if (!record.fileName.startsWith(`${record.number}-`)) {
    issues.push({ path, message: `file name number must match title number ${record.number}` });
  }

  issues.push(...sectionIssues(path, record.sections, DECISION_REQUIRED, ['Problem', 'Decision']));

  const headings = new Set(record.sections.map((section) => section.heading));
  for (const heading of PROPOSAL_ERA_HEADINGS) {
    if (headings.has(heading)) {
      issues.push({
        path,
        message: `accepted decision must not contain proposal-era section "## ${heading}"`,
      });
    }
  }

  issues.push(...alternativesIssue(path, record.sections));

  return issues;
}

/**
 * Validate a draft proposal in `adr/.drafts/` before `accept` promotes it.
 * Drafts are ephemeral and deliberately outside the `adrkit validate` surface;
 * this is the gate that keeps a half-written proposal from becoming a decision.
 */
export function validateDraft(root: string, draft: AdrRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = relative(root, draft.path);

  for (const key of draft.frontMatterExtras ?? []) {
    issues.push({ path, message: `unknown front matter field "${key}"` });
  }

  if (draft.status !== 'proposed') {
    issues.push({ path, message: `draft status must be "proposed"` });
  }

  const dateError = dateIssue(draft);
  if (dateError !== undefined) issues.push({ path, message: dateError });
  issues.push(...createdIssues(path, draft));
  if (draft.tags !== undefined) issues.push(...tagsIssues(path, draft.tags));

  const match = draft.fileName.match(/^(\d{4})-(\d{2})-(\d{2})-[a-z0-9一-鿿-]+\.md$/);
  if (match === null) {
    issues.push({ path, message: 'draft file name must be "YYYY-MM-DD-slug.md"' });
  } else if (!calendarDateIsValid(Number(match[1]), Number(match[2]), Number(match[3]))) {
    issues.push({ path, message: 'file name contains an invalid calendar date' });
  }

  issues.push(...sectionIssues(path, draft.sections, PROPOSED_REQUIRED, ['Problem', 'Proposal']));
  issues.push(...alternativesIssue(path, draft.sections));

  return issues;
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
  const target = decisions.get(record.supersededBy);
  if (target === undefined) {
    return [
      { path, message: `"superseded-by: ${record.supersededBy}" references a missing decision` },
    ];
  }
  if (target.status === 'superseded') {
    return [
      {
        path,
        message: `"superseded-by: ${record.supersededBy}" references a superseded decision; supersede that decision instead`,
      },
    ];
  }
  return [];
}

/**
 * Repository-level checks for a single record: a `superseded-by: N` reference
 * must point at an existing decision that is not itself superseded.
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
  return supersedeReferenceIssues(root, record, decisions);
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'OK';
  const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
  return `found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
