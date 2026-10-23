import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  DATE_PATTERN,
  hasMeaningfulBody,
  markdownLines,
  NUMBERED_FILE_NAME_PATTERN,
  PROPOSAL_ERA_HEADINGS,
  visibleRecordText,
  writtenHeadings,
  type AdrRecord,
  type AdrSection,
} from './adr.js';
import { ADR_DIR, CONFIG_FILE, inspectConfig } from './config.js';
import { staticPrefix } from './glob.js';
import { citationIssues } from './markers.js';
import { FOLDERS, listRecords } from './repository.js';

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
 * Shape and drift checks for `paths:` scopes. Every folder is checked the same
 * way: an archived record still has to name paths that exist in the live tree.
 */
function pathsIssues(root: string, path: string, record: AdrRecord): ValidationIssue[] {
  const paths = record.paths;
  if (paths === undefined) return [];
  const issues: ValidationIssue[] = [];
  if (paths.length === 0) {
    return [{ path, message: 'paths must not be empty' }];
  }
  const seen = new Set<string>();
  for (const entry of paths) {
    if (entry.trim().length === 0) {
      issues.push({ path, message: 'path entries must not be empty' });
      continue;
    }
    if (seen.has(entry)) {
      issues.push({ path, message: `duplicate path "${entry}"` });
    }
    seen.add(entry);
    if (entry.startsWith('/')) {
      issues.push({ path, message: `path "${entry}" must be repository-relative` });
      continue;
    }
    if (entry.split('/').includes('..')) {
      issues.push({ path, message: `path "${entry}" must not climb out of the repository` });
      continue;
    }
    if (entry.includes('\\')) {
      issues.push({ path, message: `path "${entry}" must use forward slashes` });
      continue;
    }
    const prefix = staticPrefix(entry);
    if (prefix.length > 0 && !existsSync(join(root, prefix))) {
      issues.push({
        path,
        message: `path "${entry}" matches nothing in the repository ("${prefix}" does not exist)`,
      });
    }
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
  issues.push(...pathsIssues(root, path, record));

  const numbered = record.folder === 'implemented' || record.folder === 'archived';
  if (numbered) {
    if (!NUMBERED_FILE_NAME_PATTERN.test(record.fileName)) {
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

  if (record.folder === 'implemented') {
    const consequences = record.sections.find((section) => section.heading === 'Consequences');
    if (consequences !== undefined) {
      for (const heading of writtenHeadings(consequences.body, 3)) {
        if (heading !== 'Acceptance criteria' && heading !== 'Risks') continue;
        const replacement = heading === 'Acceptance criteria' ? '### Verification' : '### Trade-offs';
        issues.push({
          path,
          message: `implemented record must not contain proposal-era subsection "### ${heading}"; use "${replacement}" and state shipped facts in the present tense`,
        });
      }
      issues.push(...laterChangesIssues(path, consequences.body));
    }
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
      if (record.created !== undefined && record.archived < record.created) {
        issues.push({ path, message: 'archived date must not precede creation' });
      }
    }
  } else if (record.archived !== undefined || record.archiveReason !== undefined) {
    issues.push({ path, message: 'archive metadata is only allowed in archived/' });
  }

  issues.push(...alternativesIssue(path, record.sections));
  return issues;
}

const AMENDED_BY_PATTERN = /^\*\*Amended by ADR \d+(?: and ADR \d+)*:\*\*/;
/**
 * A block that reads like an amendment opener. A continuation paragraph that
 * happens to begin this way is treated as a lost opening too: the alternative
 * is accepting an entry whose bold marker was dropped.
 */
const LOST_ENTRY_PATTERN = /^(?:- )?(?:(?:\*\*)?Amended by\s+ADR\s+\d+|ADR\s+\d+\s+later)\b/i;
const OLD_NOTE_PATTERN = /^(?:- )?ADR \d+ later\b/;

/**
 * The amendment-note convention the record format documents: later decisions
 * amend through a `### Later changes` subsection at the end of Consequences,
 * one entry per later decision opening `**Amended by ADR N:**`. The checks
 * catch the two drifts already observed — the old trailing-prose form and an
 * entry that lost its opening — without demanding that a note exist at all.
 */
function laterChangesIssues(path: string, body: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = [...markdownLines(body)].map(({ visible, code }) => ({ visible, code }));
  let entriesStart = -1;
  let entriesEnd = lines.length;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]!.code || !lines[index]!.visible.startsWith('### ')) continue;
    if (entriesStart === -1 && lines[index]!.visible.trim() === '### Later changes') {
      entriesStart = index;
    } else if (entriesStart !== -1) {
      entriesEnd = index;
      break;
    }
  }
  if (entriesStart !== -1) {
    const blocks = textBlocks(lines.slice(entriesStart + 1, entriesEnd));
    if (blocks.length === 0) {
      issues.push({ path, message: '"### Later changes" must contain at least one entry' });
    }
    let entries = 0;
    for (const block of blocks) {
      if (AMENDED_BY_PATTERN.test(block)) {
        entries += 1;
      } else if (entries === 0 || LOST_ENTRY_PATTERN.test(block)) {
        issues.push({ path, message: 'a "### Later changes" entry must open "**Amended by ADR N:**"' });
      }
      // After a valid opening, an ordinary block continues that entry: an
      // amendment may run over several paragraphs.
    }
  }
  const outside = [
    ...lines.slice(0, entriesStart === -1 ? lines.length : entriesStart),
    ...lines.slice(entriesEnd),
  ];
  for (const block of textBlocks(outside)) {
    if (OLD_NOTE_PATTERN.test(block)) {
      issues.push({
        path,
        message: 'amendment note is trailing prose; move it under "### Later changes" opening "**Amended by ADR N:**"',
      });
    }
  }
  return issues;
}

/** Blank-line-separated blocks of visible text; fenced code never contributes. */
function textBlocks(lines: Array<{ visible: string; code: boolean }>): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.code) {
      current = [];
      continue;
    }
    if (line.visible.trim() === '') {
      if (current.length > 0) blocks.push(current.join('\n'));
      current = [];
      continue;
    }
    current.push(line.visible);
  }
  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks;
}

/** Root Markdown files that document the directory rather than record a decision. */
function isRootDocument(name: string): boolean {
  return name === 'README.md'
    || (name.startsWith('README.') && name.endsWith('.md'))
    || name === 'notes.md'
    || name === 'AGENTS.md'
    || name === 'CLAUDE.md';
}

/**
 * The four lifecycle folders are the whole inventory. A record at the adr
 * root, in an unknown folder, or nested below a lifecycle folder is still a
 * record: report it instead of letting listRecords skip it silently. Unknown
 * folders fail even when empty, because the directory contract admits no
 * second taxonomy and an empty folder is the first half of a silent record.
 */
function inventoryIssues(root: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adrDir = join(root, ADR_DIR);
  if (!existsSync(adrDir)) return issues;
  const lifecycle = new Set<string>(FOLDERS);
  const lifecycleNames = FOLDERS.map((folder) => `${folder}/`).join(', ');
  for (const entry of readdirSync(adrDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!lifecycle.has(entry.name)) {
        issues.push({
          path: `${ADR_DIR}/${entry.name}`,
          message: `unknown folder; only ${lifecycleNames} may sit under ${ADR_DIR}/`,
        });
      }
      continue;
    }
    if (entry.name.endsWith('.md') && !isRootDocument(entry.name)) {
      issues.push({
        path: `${ADR_DIR}/${entry.name}`,
        message: `record is outside a lifecycle folder; move it into ${lifecycleNames}`,
      });
    }
  }
  for (const folder of FOLDERS) {
    const dir = join(adrDir, folder);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      issues.push({
        path: `${ADR_DIR}/${folder}/${entry.name}`,
        message: `nested folder; records must sit directly in ${folder}/`,
      });
    }
  }
  return issues;
}

export function validateRepository(root: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const configFile = join(root, ADR_DIR, CONFIG_FILE);
  if (!existsSync(configFile)) {
    issues.push({ path: `${ADR_DIR}/${CONFIG_FILE}`, message: 'missing config file' });
  } else {
    try {
      for (const message of inspectConfig(root).issues) {
        issues.push({ path: `${ADR_DIR}/${CONFIG_FILE}`, message });
      }
    } catch (error) {
      issues.push({
        path: `${ADR_DIR}/${CONFIG_FILE}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  issues.push(...inventoryIssues(root));

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

  // Code citations cross file and record boundaries, so they are a corpus
  // property checked once here rather than inside one record's validation.
  issues.push(...citationIssues(root, records));

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
    // An accepted-then-archived terminal is a valid end, so only the status is
    // checked, not the folder: `archive` may retire a decision nothing
    // replaced, and the chain then leads into frozen history by design. Code
    // citations (`@adr`) are the surface that must name current authority.
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
 * A record body may name other decisions. The decision map mines those
 * references but silently drops the ones that resolve to nothing, so this
 * reports a reference to a decision number that does not exist. Only prose the
 * reader can see is mined — comment-masked lines and fenced code never count —
 * and the map's edge mining reads the same text. The record's own number is
 * not a reference, and the title line is not scanned because it is not a
 * section.
 */
function danglingReferenceIssues(
  path: string,
  record: AdrRecord,
  decisions: Map<number, AdrRecord>,
): ValidationIssue[] {
  // The same visible-prose vocabulary the decision map mines: `ADR-12`,
  // `ADR 4`, `ADR12`.
  const pattern = /ADR-?\s*([1-9]\d*)/g;
  const numbers = new Set<number>();
  const text = visibleRecordText(record);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    numbers.add(Number(match[1]));
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
  // Issue paths arrive with the platform separator (they come from node:path
  // math); the report speaks the repository's forward-slash convention.
  const lines = issues.map((issue) => `  ${issue.path.replace(/\\/g, '/')}: ${issue.message}`);
  return `found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
