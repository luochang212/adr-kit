import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADR_DIR } from './config.js';

/**
 * The note buffer: adr/notes.md, a plain file outside the lifecycle. It gives
 * the settle moment a one-line legal action — capture now, shape later through
 * propose/grill/record — without putting an unshaped fragment through the
 * record format or inventing a fifth lifecycle folder (ADR 18). Nothing parses
 * it: validate ignores the file (record discovery reads only the four
 * lifecycle folders), and the commands that surface it count non-empty lines.
 */
export const NOTES_FILE = 'notes.md';

export function notesPath(root: string): string {
  return join(root, ADR_DIR, NOTES_FILE);
}

/** Local timestamp prefix of a note line: `YYYY-MM-DD HH:mm`. */
function noteStamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    ` ${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

/**
 * Append one note line and return the written line. Multi-line or padded
 * input collapses to the single line the buffer promises; empty text is a
 * caller error the command layer reports.
 */
export function appendNote(root: string, text: string): string {
  const line = `${noteStamp()} ${text.replace(/\s+/g, ' ').trim()}`;
  const file = notesPath(root);
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  // Append one buffer instead of replacing the snapshot read above: another
  // writer may already have appended since that read. Concurrent repair of a
  // missing trailing newline can add a blank line, but never loses a note.
  appendFileSync(file, `${separator}${line}\n`);
  return line;
}

/** Number of unshaped notes: non-empty lines of the buffer, 0 without the file. */
export function countUnshapedNotes(root: string): number {
  const file = notesPath(root);
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0).length;
}

/** The one-line debt surfacing shared by `list` and `instructions`. Empty when no notes wait. */
export function unshapedNotesLine(root: string): string {
  const count = countUnshapedNotes(root);
  if (count === 0) return '';
  const noun = count === 1 ? 'note' : 'notes';
  return `${count} unshaped ${noun} in adr/notes.md — park one: adrkit note "<one line>"; shape one: adrkit propose / grill / record`;
}
