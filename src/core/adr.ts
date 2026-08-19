import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'yaml';

export type AdrStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type AdrFolder = 'proposed' | 'decisions' | 'rejected';

/** Canonical front matter field order; only fields that exist are written. */
export const FRONT_MATTER_ORDER = ['status', 'date', 'reason', 'superseded-by'] as const;

/** Sections that only make sense during the proposal era and must not appear in an accepted decision. */
export const PROPOSAL_ERA_HEADINGS = ['Proposal', 'Acceptance criteria', 'Risks', 'Plan', 'Migration plan'];

/** A `YYYY-MM-DD` date value. Shared by the parser (format) and validate (calendar validity). */
export const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Today's date as `YYYY-MM-DD` in local time. The single source of the date:
 * it feeds the `date` front matter field that every record carries and the
 * `YYYY-MM-DD-` prefix of proposal file names, so the two always agree.
 */
export function todayStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface AdrSection {
  heading: string;
  body: string;
}

export interface AdrRecord {
  folder: AdrFolder;
  path: string;
  fileName: string;
  title: string;
  status: AdrStatus;
  /** Date the current status was recorded, `YYYY-MM-DD` in local time. */
  date: string;
  rejectionReason?: string;
  /** For superseded decisions: the number of the decision that replaced this one. */
  supersededBy?: number;
  number?: number;
  sections: AdrSection[];
  /** Front matter keys outside the canonical set; validate reports them. */
  frontMatterExtras?: string[];
}

export class AdrFormatError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(`${message} (${path})`);
    this.name = 'AdrFormatError';
  }
}

export function statusForFolder(folder: AdrFolder): AdrStatus {
  switch (folder) {
    case 'decisions':
      return 'accepted';
    case 'proposed':
      return 'proposed';
    case 'rejected':
      return 'rejected';
  }
}

export function folderForStatus(status: AdrStatus): AdrFolder {
  switch (status) {
    case 'accepted':
    case 'superseded':
      return 'decisions';
    case 'proposed':
      return 'proposed';
    case 'rejected':
      return 'rejected';
  }
}

export function section(record: AdrRecord, heading: string): string | undefined {
  return record.sections.find((candidate) => candidate.heading === heading)?.body;
}

export function hasMeaningfulBody(body: string | undefined): boolean {
  if (body === undefined) return false;
  const withoutComments = body.replace(/<!--[\s\S]*?-->/g, '');
  return withoutComments.trim().length > 0;
}

/**
 * Parse a single ADR markdown file into its structured parts.
 *
 * The format is YAML front matter followed by a Markdown body:
 *
 *   ---
 *   status: proposed | accepted | rejected | superseded
 *   date: YYYY-MM-DD
 *   reason: <why>            (rejected only)
 *   superseded-by: <N>       (superseded only)
 *   ---
 *
 *   # ADR: <title or "N Title">
 *
 *   ## Problem
 *   ...
 *
 * The `date` field records the date the current status was reached and is
 * stamped by the CLI at every lifecycle move (propose, decide, accept,
 * reject, supersede).
 */
export function parseAdrFile(filePath: string): AdrRecord {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  if (lines[0] !== '---') {
    throw new AdrFormatError('file must start with a YAML front matter block ("---")', filePath);
  }
  const closing = lines.indexOf('---', 1);
  if (closing === -1) {
    throw new AdrFormatError('front matter block is not closed ("---" missing)', filePath);
  }

  let frontMatter: unknown;
  try {
    frontMatter = parse(lines.slice(1, closing).join('\n'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AdrFormatError(`front matter is not valid YAML: ${detail}`, filePath);
  }
  if (typeof frontMatter !== 'object' || frontMatter === null || Array.isArray(frontMatter)) {
    throw new AdrFormatError('front matter must be a YAML mapping', filePath);
  }
  const fields = frontMatter as Record<string, unknown>;

  const extras = Object.keys(fields).filter(
    (key) => !(FRONT_MATTER_ORDER as readonly string[]).includes(key),
  );

  const statusText = fields['status'];
  if (statusText === undefined) {
    throw new AdrFormatError('front matter must include "status"', filePath);
  }
  if (
    statusText !== 'proposed' &&
    statusText !== 'accepted' &&
    statusText !== 'rejected' &&
    statusText !== 'superseded'
  ) {
    throw new AdrFormatError(
      'status must be "proposed", "accepted", "rejected", or "superseded"',
      filePath,
    );
  }
  const status: AdrStatus = statusText;

  const dateText = fields['date'];
  if (dateText === undefined) {
    throw new AdrFormatError('front matter must include "date"', filePath);
  }
  if (typeof dateText !== 'string' || !DATE_PATTERN.test(dateText)) {
    throw new AdrFormatError('date must be a "YYYY-MM-DD" string', filePath);
  }
  const date = dateText;

  let rejectionReason: string | undefined;
  const reason = fields['reason'];
  if (status === 'rejected') {
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AdrFormatError('rejected status requires a non-empty "reason"', filePath);
    }
    rejectionReason = reason;
  } else if (reason !== undefined) {
    throw new AdrFormatError('"reason" is only allowed when status is "rejected"', filePath);
  }

  let supersededBy: number | undefined;
  const supersededByField = fields['superseded-by'];
  if (status === 'superseded') {
    if (
      typeof supersededByField !== 'number' ||
      !Number.isInteger(supersededByField) ||
      supersededByField < 1
    ) {
      throw new AdrFormatError(
        'superseded status requires a positive integer "superseded-by"',
        filePath,
      );
    }
    supersededBy = supersededByField;
  } else if (supersededByField !== undefined) {
    throw new AdrFormatError('"superseded-by" is only allowed when status is "superseded"', filePath);
  }

  const body = lines.slice(closing + 1);
  if ((body[0] ?? '') !== '') {
    throw new AdrFormatError('front matter must be followed by a blank line', filePath);
  }
  const titleLine = body[1] ?? '';
  if (!titleLine.startsWith('# ADR: ')) {
    throw new AdrFormatError('title line must be "# ADR: <title>"', filePath);
  }
  const title = titleLine.slice('# ADR: '.length).trim();
  if (title.length === 0) {
    throw new AdrFormatError('ADR title must not be empty', filePath);
  }
  if ((body[2] ?? '') !== '') {
    throw new AdrFormatError('the title must be followed by a blank line', filePath);
  }

  const sections: AdrSection[] = [];
  let current: AdrSection | null = null;
  for (const line of body.slice(3)) {
    if (line.startsWith('## ')) {
      if (current !== null) sections.push(current);
      const heading = line.slice(3).trim();
      if (heading.length === 0) {
        throw new AdrFormatError('section heading must not be empty', filePath);
      }
      current = { heading, body: '' };
    } else if (current !== null) {
      current.body += `${line}\n`;
    }
  }
  if (current !== null) sections.push(current);

  const numberMatch = title.match(/^([1-9]\d*)\s+(.+)$/);
  const parsed: AdrRecord = {
    folder: 'proposed',
    path: filePath,
    fileName: basename(filePath),
    title,
    status,
    date,
    sections,
  };
  if (rejectionReason !== undefined) parsed.rejectionReason = rejectionReason;
  if (supersededBy !== undefined) parsed.supersededBy = supersededBy;
  if (extras.length > 0) parsed.frontMatterExtras = extras;
  if (numberMatch !== null) {
    parsed.number = Number(numberMatch[1]);
  }
  return parsed;
}

