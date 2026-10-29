import { basename } from 'node:path';
import { parse } from 'yaml';
import { readRegularText } from './files.js';

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
export const FRONT_MATTER_ORDER = ['status', 'date', 'description', 'raised-by', 'decided-by', 'created', 'commit', 'superseded-by', 'reason', 'archived', 'archive-reason', 'paths'] as const;

/** File name of a numbered record in implemented/ or archived/: `N-slug.md`. */
export const NUMBERED_FILE_NAME_PATTERN = /^[1-9]\d*-[a-z0-9一-鿿-]+\.md$/;

/** Sections that only make sense during the proposal era and must not appear in an implemented decision. */
export const PROPOSAL_ERA_HEADINGS = ['Proposal', 'Acceptance criteria', 'Risks', 'Plan', 'Migration plan'];

/** A `YYYY-MM-DD` date value. Shared by the parser (format) and validate (calendar validity). */
export const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A record title is written verbatim after `# ADR: `, so a line break would
 * split the heading and leave a file the parser cannot read. Reject it at the
 * input boundary; the template parse check in the creator is the backstop.
 */
export function assertSingleLineTitle(title: string): string {
  if (/[\r\n]/.test(title)) {
    throw new Error('title must be a single line; remove the line break');
  }
  return title;
}

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
  /** Raw Markdown, including comments; validate applies the lifecycle's written-content requirements. */
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
   * through. Declared by the writer at record or implement time, never inferred or
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
  /** A sentence explaining the decision's subject and when it is relevant. */
  description?: string;
  /**
   * Optional repository-relative globs naming the files this record governs.
   * The retrieval axis `adrkit relevant` matches against: a scope answers
   * "which decisions govern this file?". Minimal
   * glob semantics (`**` crosses separators, `*` within a segment, `?` one
   * character); validate checks the shape and that the static directory anchor
   * (or full literal path) exists, in every folder alike.
   */
  paths?: string[];
  number?: number;
  sections: AdrSection[];
  /**
   * Visible prose between the title and the first `## ` section, when any
   * exists. The parser ignores it when naming sections and the implement
   * rewrite drops it, so carriers of this field must warn before a lifecycle
   * move silently loses it (the context comment propose injects here is an
   * HTML comment and never counts).
   */
  introProse?: string;
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
 *
 * `proseOnly` excludes fenced code as well. The record format requires written
 * prose in its required sections, while a visible code example still counts as
 * content when deciding whether a lifecycle move would lose material (the
 * `introProse` warning). The two questions need different answers, so the
 * caller states which one it is asking.
 */
export function hasMeaningfulBody(
  body: string | undefined,
  options: { proseOnly?: boolean } = {},
): boolean {
  if (body === undefined) return false;
  for (const line of markdownLines(body)) {
    if (options.proseOnly === true && line.code) continue;
    if (line.visible.trim().length > 0) return true;
  }
  return false;
}

/** Keep record-format errors contextual around the shared safe reader. */
function readRecordFile(filePath: string): string {
  try {
    return readRegularText(filePath, 'record');
  } catch (error) {
    throw new AdrFormatError(error instanceof Error ? error.message : String(error), filePath);
  }
}

/** A Markdown fenced-code opener: three or more backticks or tildes. */
interface Fence {
  readonly char: string;
  readonly length: number;
}

/**
 * A fence opener may be indented by at most three spaces. Four or more spaces
 * make an indented code block, which has no closing fence and must not hide
 * the sections that follow it.
 */
function openingFence(line: string): Fence | undefined {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
  if (match === null) return undefined;
  const marker = match[1]!;
  return { char: marker[0]!, length: marker.length };
}

/**
 * A closing fence uses the opener's character, is at least as long, and has
 * nothing but whitespace after it. A fence-looking line inside a block (for
 * example a shorter marker or an info string) stays content.
 */
function closesFence(line: string, fence: Fence): boolean {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
  if (match === null) return false;
  const marker = match[1]!;
  return marker[0] === fence.char && marker.length >= fence.length;
}

interface MarkdownLine {
  raw: string;
  visible: string;
  code: boolean;
}

/**
 * One linear scan for content and heading checks. Comments cross line and
 * section boundaries; fence contents are literal, including HTML markers.
 * Masking comments preserves columns so removing one cannot invent a heading.
 * Outline consumers may opt into indented fences for examples nested in lists;
 * record heading/content checks retain the top-level indentation rules.
 */
export function* markdownLines(body: string, options: { indentedFences?: boolean } = {}): Generator<MarkdownLine> {
  const indentedFences = options.indentedFences === true;
  const listIndents: number[] = [];
  let fence: (Fence & { containerIndent: number }) | undefined;
  let comment = false;
  for (const raw of body.split(/\r?\n/)) {
    // Outline indentation follows the deliberation parser's two-space tabs.
    const expanded = indentedFences ? raw.replace(/\t/g, '  ') : raw;
    const indent = expanded.match(/^ */)![0].length;
    if (fence !== undefined && expanded.trim().length > 0 && indent < fence.containerIndent) {
      // An unclosed nested fence ends with its list item. Reprocess this line
      // so a sibling option or an independent question cannot disappear.
      fence = undefined;
    }
    if (fence !== undefined) {
      if (closesFence(expanded.slice(fence.containerIndent), fence)) fence = undefined;
      yield { raw, visible: raw, code: true };
      continue;
    }
    let containerIndent = 0;
    if (indentedFences && !comment && /^ *(`{3,}|~{3,})/.test(expanded)) {
      while (listIndents.length > 0 && listIndents[listIndents.length - 1]! > indent) listIndents.pop();
      containerIndent = listIndents[listIndents.length - 1] ?? 0;
    }
    const opener = comment ? undefined : openingFence(expanded.slice(containerIndent));
    if (opener !== undefined) {
      fence = { ...opener, containerIndent };
      yield { raw, visible: raw, code: true };
      continue;
    }
    // Index matching backtick runs once, rather than repeatedly searching the
    // remaining line. Inline examples such as `<!--` are literal text too.
    const inlineEnds = new Map<number, number>();
    const nextRun = new Map<number, number>();
    const runs = [...raw.matchAll(/`+/g)];
    for (let run = runs.length - 1; run >= 0; run -= 1) {
      const match = runs[run]!;
      const end = nextRun.get(match[0].length);
      if (end !== undefined) inlineEnds.set(match.index, end);
      nextRun.set(match[0].length, match.index + match[0].length);
    }
    const tokens = /<!--|`+/g;
    let visible = '';
    let index = 0;
    while (index < raw.length) {
      if (comment) {
        const end = raw.indexOf('-->', index);
        const next = end === -1 ? raw.length : end + 3;
        visible += ' '.repeat(next - index);
        index = next;
        if (end !== -1) comment = false;
      } else {
        tokens.lastIndex = index;
        const token = tokens.exec(raw);
        if (token === null) {
          visible += raw.slice(index);
          break;
        }
        if (token[0] === '<!--') {
          visible += raw.slice(index, token.index);
          comment = true;
          index = token.index;
        } else {
          const end = inlineEnds.get(token.index) ?? token.index + token[0].length;
          visible += raw.slice(index, end);
          index = end;
        }
      }
    }
    if (indentedFences && visible.trim().length > 0) {
      const outline = visible.replace(/\t/g, '  ');
      const outlineIndent = outline.match(/^ */)![0].length;
      while (listIndents.length > 0 && listIndents[listIndents.length - 1]! > outlineIndent) listIndents.pop();
      const bullet = outline.match(/^ *[-*+] +/);
      if (bullet !== null) listIndents.push(bullet[0].length);
    }
    yield { raw, visible, code: false };
  }
}

/** Headings of exactly level outside fenced code and HTML comments. */
export function writtenHeadings(body: string, level: number): string[] {
  const prefix = `${'#'.repeat(level)} `;
  const headings: string[] = [];
  for (const line of markdownLines(body)) {
    if (!line.code && line.visible.startsWith(prefix)) headings.push(line.visible.slice(prefix.length).trim());
  }
  return headings;
}

/**
 * A record's prose as the reader sees it: section headings plus comment-masked
 * body lines outside fenced code. Cross-reference mining (validation's
 * dangling-reference check and the decision map's edges) reads this, so text a
 * reader cannot see — an HTML comment or a fenced example — is never mistaken
 * for a reference.
 */
export function visibleRecordText(record: Pick<AdrRecord, 'sections'>): string {
  const lines: string[] = [];
  for (const sec of record.sections) {
    lines.push(sec.heading);
    for (const line of markdownLines(sec.body)) {
      if (!line.code) lines.push(line.visible);
    }
  }
  return lines.join('\n');
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
  return parseAdrText(readRecordFile(filePath), filePath);
}

/** Parse generated content before a lifecycle move writes or removes any file. */
export function parseAdrText(text: string, filePath: string): AdrRecord {
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

  const description = fields['description'];
  if (description !== undefined && typeof description !== 'string') {
    throw new AdrFormatError('description must be a string', filePath);
  }

  let paths: string[] | undefined;
  const pathsField = fields['paths'];
  if (pathsField !== undefined) {
    if (!Array.isArray(pathsField) || !pathsField.every((entry) => typeof entry === 'string')) {
      throw new AdrFormatError('paths must be a list of strings', filePath);
    }
    paths = pathsField as string[];
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
  const intro: string[] = [];
  for (const scanned of markdownLines(body.slice(3).join('\n'))) {
    const line = scanned.raw;
    if (!scanned.code && scanned.visible.startsWith('## ')) {
      if (current !== null) sections.push(current);
      // The heading text comes from the visible line: a trailing HTML comment
      // is masked there, so "## Decision <!-- note -->" names the section
      // "Decision" instead of a heading no reader can match.
      const heading = scanned.visible.slice(3).trim();
      if (heading.length === 0) {
        throw new AdrFormatError('section heading must not be empty', filePath);
      }
      // Keep trailing comments in the body so a comment opened on the heading
      // still hides its continuation during section scans and lifecycle rewrites.
      // The scanner masks comments without shifting columns.
      const trailing = line.slice(scanned.visible.trimEnd().length);
      current = { heading, body: trailing.trim().length > 0 ? `${trailing}\n` : '' };
    } else if (current !== null) {
      current.body += `${line}\n`;
    } else {
      // Nothing is collected into a section here, but visible prose a reader
      // can see must not vanish silently on a lifecycle move: remember it.
      intro.push(line);
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
  if (description !== undefined) parsed.description = description;
  if (paths !== undefined) parsed.paths = paths;
  if (rejectionReason !== undefined) parsed.rejectionReason = rejectionReason;
  if (supersededBy !== undefined) parsed.supersededBy = supersededBy;
  if (archived !== undefined) parsed.archived = archived;
  if (archiveReason !== undefined) parsed.archiveReason = archiveReason;
  if (extras.length > 0) parsed.frontMatterExtras = extras;
  if (numberMatch !== null) {
    parsed.number = Number(numberMatch[1]);
  }
  if (hasMeaningfulBody(intro.join('\n'))) {
    parsed.introProse = intro.join('\n').trim();
  }
  return parsed;
}
