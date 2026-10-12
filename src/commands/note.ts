import { requireRoot } from '../core/config.js';
import { appendNote } from '../core/notes.js';

export function noteCommand(text: string, cwd: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error('note requires a line of text');
  }
  const root = requireRoot(cwd);
  const line = appendNote(root, trimmed);
  return [
    'noted in adr/notes.md',
    '',
    `  ${line}`,
    '',
    'The buffer is capture, not record: shape it through adrkit propose / grill / record when the moment allows, and adrkit list counts what is still unshaped.',
  ].join('\n');
}
