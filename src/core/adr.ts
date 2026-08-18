import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export type AdrStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';
export type AdrFolder = 'proposed' | 'decisions' | 'rejected';

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
  rejectionReason?: string;
  /** For superseded decisions: the number of the decision that replaced this one. */
  supersededBy?: number;
  number?: number;
  sections: AdrSection[];
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
 * The format is deliberately plain Markdown, with no front matter:
 *
 *   # ADR: <title or "N Title">
 *   Status: proposed | accepted | rejected — <reason>
 *   <blank line>
 *   ## Problem
 *   ...
 */
export function parseAdrFile(filePath: string): AdrRecord {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  const titleLine = lines[0] ?? '';
  if (!titleLine.startsWith('# ADR: ')) {
    throw new AdrFormatError('first line must be "# ADR: <title>"', filePath);
  }
  const title = titleLine.slice('# ADR: '.length).trim();
  if (title.length === 0) {
    throw new AdrFormatError('ADR title must not be empty', filePath);
  }

  const statusLine = lines[1] ?? '';
  if (!statusLine.startsWith('Status: ')) {
    throw new AdrFormatError('second line must be "Status: <status>"', filePath);
  }
  const statusText = statusLine.slice('Status: '.length).trim();

  let status: AdrStatus;
  let rejectionReason: string | undefined;
  let supersededBy: number | undefined;
  if (statusText === 'proposed') {
    status = 'proposed';
  } else if (statusText === 'accepted') {
    status = 'accepted';
  } else if (statusText.startsWith('rejected — ')) {
    status = 'rejected';
    rejectionReason = statusText.slice('rejected — '.length).trim();
    if (rejectionReason.length === 0) {
      throw new AdrFormatError('rejected status must include a reason', filePath);
    }
  } else if (/^superseded by [1-9]\d*$/.test(statusText)) {
    status = 'superseded';
    supersededBy = Number(statusText.slice('superseded by '.length));
  } else {
    throw new AdrFormatError(
      'status must be "proposed", "accepted", "rejected — <reason>", or "superseded by N"',
      filePath,
    );
  }

  if ((lines[2] ?? '') !== '') {
    throw new AdrFormatError('line 3 must be blank', filePath);
  }

  const sections: AdrSection[] = [];
  let current: AdrSection | null = null;
  for (const line of lines.slice(3)) {
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
    sections,
  };
  if (rejectionReason !== undefined) parsed.rejectionReason = rejectionReason;
  if (supersededBy !== undefined) parsed.supersededBy = supersededBy;
  if (numberMatch !== null) {
    parsed.number = Number(numberMatch[1]);
  }
  return parsed;
}

