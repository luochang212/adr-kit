import { readFileSync, statSync, type Stats } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'yaml';

export type AdrStatus = 'proposed' | 'implemented' | 'rejected' | 'superseded';
/**
 * The two declaration values, single-sourced: the parser, the CLI prompt, and
 * the shell completion scripts all read the set from here, so a third value
 * could never be added in one place and forgotten in another.
 */
export const DECIDED_BY_VALUES = ['human', 'agent'] as const;
/**
 * Who made the decision: `human` when a person determined the direction (they
 * stated it, changed a proposal into what shipped, or someone is recording one
 * they made earlier), `agent` when it came from the agent's own judgment. This
 * is a declaration by whoever writes the record, not an observation — the CLI
 * cannot see who chose, so it asks for the value instead of inferring one. It
 * records where the choice came from, not who ran the command, and a passive
 * approval leaves the source with the agent. Identity is git's job; this is the
 * one axis git cannot answer, because an agent session commits as the human
 * user.
 */
export type DecidedBy = (typeof DECIDED_BY_VALUES)[number];

/** Narrow an unknown front matter value to a declaration. */
export function isDecidedBy(value: unknown): value is DecidedBy {
  return typeof value === 'string' && (DECIDED_BY_VALUES as readonly string[]).includes(value);
}
/**
 * Who put the decision on the table, as opposed to `decided-by`, whose
 * judgment settled it. The same two values on a different axis: a person may
 * raise what the agent settles, and the agent may raise what a person settles.
 * Declared on entry to implemented/, never inferred; proposals do not carry it.
 */
export type RaisedBy = DecidedBy;
/** Narrow an unknown front matter value to a raised-by declaration. */
export function isRaisedBy(value: unknown): value is RaisedBy {
  return isDecidedBy(value);
}
/**
 * The four lifecycle directories. Numbered decisions occupy implemented/
 * or archived/; unnumbered proposals occupy proposed/ or rejected/.
 */
export type AdrFolder = 'proposed' | 'implemented' | 'rejected' | 'archived';

/** Canonical front matter field order; only fields that exist are written. */
export const FRONT_MATTER_ORDER = ['status', 'date', 'raised-by', 'decided-by', 'created', 'commit', 'superseded-by', 'reason', 'archived', 'archive-reason', 'tags'] as const;

/** File name of a numbered record in implemented/ or archived/: `N-slug.md`. */
export const NUMBERED_FILE_NAME_PATTERN = /^[1-9]\d*-[a-z0-9一-鿿-]+\.md$/;

/** Sections that only make sense during the proposal era and must not appear in an implemented decision. */
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
  /** Date of the latest lifecycle move, `YYYY-MM-DD` in local time. */
  date: string;
  /**
   * For durable records: who put the decision on the table. The `decided-by`
   * axis turned around: a person may raise what the agent settles, and vice
   * versa. Declared by the writer on implementation, never inferred or
   * verified. An unshipped proposal never carries it.
   */
  raisedBy?: RaisedBy;
  /**
   * For durable records: who made the decision. "Who made it" means whoever
   * originated the choice, not whoever ran the command. `human` covers a
   * person's own choice, a proposal they changed into what shipped, and a
   * choice they made earlier that is only now being recorded; `agent` means the
   * direction came from the agent's own judgment, even when a person let it
   * through. Declared by the writer at decide or accept time, never inferred or
   * verified. An unshipped proposal never carries it.
   */
  decidedBy?: DecidedBy;
  /** Date the record was created; stamped once and never re-stamped, so the
   * time axis survives later lifecycle moves. */
  created?: string;
  /** Short git hash the decision was recorded against; auto-stamped when in a git repo. */
  commit?: string;
  rejectionReason?: string;
  /** For superseded decisions: the number of the decision that replaced this one. */
  /** Immediate historical successor; validation follows the chain to an implemented record. */
  supersededBy?: number;
  /** Date a shipped record entered frozen history. */
  archived?: string;
  /** Why a shipped record no longer needs to be active guidance. */
  archiveReason?: string;
  /** Optional kebab-case theme keywords; validate checks the shape. */
  tags?: string[];
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

export function section(record: AdrRecord, heading: string): string | undefined {
  return record.sections.find((candidate) => candidate.heading === heading)?.body;
}

/**
 * Text outside HTML comments. The scan walks `indexOf` from each `<!--` to the
 * next `-->` rather than matching a `[\s\S]*?` expression: a marker with no
 * closing tag makes the expression rescan to the end of the body from every
 * position, so a crafted body costs the square of its size (~500 KB took over
 * ten seconds, and multi-megabyte payloads never returned). An unterminated
 * comment swallows the rest of the section, which is CommonMark's reading of a
 * comment block that runs to its end of context.
 */
function stripComments(body: string): string {
  const open = '<!--';
  const close = '-->';
  let text = '';
  let index = 0;
  for (;;) {
    const start = body.indexOf(open, index);
    if (start === -1) return text + body.slice(index);
    text += body.slice(index, start);
    const end = body.indexOf(close, start + open.length);
    if (end === -1) return text;
    index = end + close.length;
  }
}

export function hasMeaningfulBody(body: string | undefined): boolean {
  if (body === undefined) return false;
  return stripComments(body).trim().length > 0;
}

/**
 * The kind of a path that is not a regular file, named in the error so the
 * reader learns what is there (`directory`, `fifo`, `character device`).
 */
function pathKind(info: Stats): string {
  if (info.isDirectory()) return 'directory';
  if (info.isFIFO()) return 'fifo';
  if (info.isSocket()) return 'socket';
  if (info.isCharacterDevice()) return 'character device';
  if (info.isBlockDevice()) return 'block device';
  return 'special file';
}

/**
 * Read a record's text, refusing a path that does not resolve to a regular
 * file. A FIFO blocks the read until a writer appears and a device (a symlink
 * to `/dev/zero`, which git can carry as mode 120000) reads without end, so the
 * kind is reported instead of read. The check follows symbolic links: a link
 * whose target is a regular file is a record like any other.
 */
function readRecordFile(filePath: string): string {
  let info: Stats;
  try {
    info = statSync(filePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new AdrFormatError(`record path cannot be read: ${detail}`, filePath);
  }
  if (!info.isFile()) {
    throw new AdrFormatError(
      `record path is not a regular file (${pathKind(info)})`,
      filePath,
    );
  }
  return readFileSync(filePath, 'utf8');
}

/**
 * Parse a single ADR markdown file into its structured parts.
 *
 * The format is YAML front matter followed by a Markdown body:
 *
 *   ---
 *   status: proposed | implemented | rejected | superseded
 *   date: YYYY-MM-DD
 *   raised-by: human | agent    (durable records only)
 *   decided-by: human | agent   (durable records only)
 *   reason: <why>            (rejected only)
 *   superseded-by: <N>       (superseded only)
 *   ---
 *
 *   # ADR: <title or "N Title">
 *
 *   ## Problem
 *   ...
 *
 * The `date` field records the date of the latest lifecycle move and is
 * stamped by the CLI at every lifecycle move.
 */
export function parseAdrFile(filePath: string): AdrRecord {
  const text = readRecordFile(filePath);
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
    statusText !== 'implemented' &&
    statusText !== 'rejected' &&
    statusText !== 'superseded'
  ) {
    throw new AdrFormatError(
      'status must be "proposed", "implemented", "rejected", or "superseded"',
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

  let raisedBy: RaisedBy | undefined;
  const raisedByField = fields['raised-by'];
  if (raisedByField !== undefined) {
    if (!isRaisedBy(raisedByField)) {
      throw new AdrFormatError('raised-by must be "human" or "agent"', filePath);
    }
    raisedBy = raisedByField;
  }

  let decidedBy: DecidedBy | undefined;
  const decidedByField = fields['decided-by'];
  if (decidedByField !== undefined) {
    if (!isDecidedBy(decidedByField)) {
      throw new AdrFormatError(
        'decided-by must be "human" or "agent"',
        filePath,
      );
    }
    decidedBy = decidedByField;
  }

  let created: string | undefined;
  const createdField = fields['created'];
  if (createdField !== undefined) {
    if (typeof createdField !== 'string' || !DATE_PATTERN.test(createdField)) {
      throw new AdrFormatError('created must be a "YYYY-MM-DD" string', filePath);
    }
    created = createdField;
  }

  let tags: string[] | undefined;
  const tagsField = fields['tags'];
  if (tagsField !== undefined) {
    if (!Array.isArray(tagsField) || !tagsField.every((tag) => typeof tag === 'string')) {
      throw new AdrFormatError('tags must be a list of strings', filePath);
    }
    tags = tagsField as string[];
  }

  let commit: string | undefined;
  const commitField = fields['commit'];
  if (commitField !== undefined) {
    if (typeof commitField !== 'string' || commitField.trim().length === 0) {
      throw new AdrFormatError('commit must be a non-empty string', filePath);
    }
    commit = commitField.trim();
  }

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

  let archived: string | undefined;
  const archivedField = fields['archived'];
  if (archivedField !== undefined) {
    if (typeof archivedField !== 'string' || !DATE_PATTERN.test(archivedField)) {
      throw new AdrFormatError('archived must be a "YYYY-MM-DD" string', filePath);
    }
    archived = archivedField;
  }
  let archiveReason: string | undefined;
  const archiveReasonField = fields['archive-reason'];
  if (archiveReasonField !== undefined) {
    if (typeof archiveReasonField !== 'string' || archiveReasonField.trim().length === 0) {
      throw new AdrFormatError('archive-reason must be a non-empty string', filePath);
    }
    archiveReason = archiveReasonField.trim();
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
  // The parser does not know which folder the file lives in; listRecords and
  // Repository readers set the actual folder after scanning.
  const parsed: AdrRecord = {
    folder: 'proposed',
    path: filePath,
    fileName: basename(filePath),
    title,
    status,
    date,
    sections,
  };
  if (commit !== undefined) parsed.commit = commit;
  if (raisedBy !== undefined) parsed.raisedBy = raisedBy;
  if (decidedBy !== undefined) parsed.decidedBy = decidedBy;
  if (created !== undefined) parsed.created = created;
  if (tags !== undefined) parsed.tags = tags;
  if (rejectionReason !== undefined) parsed.rejectionReason = rejectionReason;
  if (supersededBy !== undefined) parsed.supersededBy = supersededBy;
  if (archived !== undefined) parsed.archived = archived;
  if (archiveReason !== undefined) parsed.archiveReason = archiveReason;
  if (extras.length > 0) parsed.frontMatterExtras = extras;
  if (numberMatch !== null) {
    parsed.number = Number(numberMatch[1]);
  }
  return parsed;
}
