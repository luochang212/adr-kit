import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { initCommand } from '../src/commands/init.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { listCommand } from '../src/commands/list.js';
import { noteCommand } from '../src/commands/note.js';
import { proposeCommand } from '../src/commands/propose.js';
import { completionCommand } from '../src/commands/completion.js';
import { validateCommand } from '../src/commands/validate.js';
import { countUnshapedNotes, NOTES_FILE, notesPath } from '../src/core/notes.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-notes-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('noteCommand', () => {
  it('creates the buffer on first use with a timestamped line', () => {
    const root = makeRepo();
    const output = noteCommand('consider LRU vs LFU for the response cache', root);
    expect(output).toContain('noted in adr/notes.md');
    const file = readFileSync(notesPath(root), 'utf8');
    expect(file).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} consider LRU vs LFU for the response cache\n$/);
  });

  it('collapses multi-line input into the one line the buffer promises', () => {
    const root = makeRepo();
    noteCommand('first  choice\nspans   lines', root);
    const file = readFileSync(notesPath(root), 'utf8');
    expect(file).toMatch(/ first choice spans lines\n$/);
    expect(file.split('\n')).toHaveLength(2);
  });

  it('appends without clobbering earlier notes', () => {
    const root = makeRepo();
    noteCommand('first note', root);
    noteCommand('second note', root);
    const file = readFileSync(notesPath(root), 'utf8');
    expect(countUnshapedNotes(root)).toBe(2);
    expect(file.indexOf('first note')).toBeLessThan(file.indexOf('second note'));
  });

  it('refuses an empty note and works only inside a repository', () => {
    const root = makeRepo();
    expect(() => noteCommand('   \n  ', root)).toThrow(/requires a line of text/);
    expect(() => noteCommand('orphan', mkdtempSync(join(tmpdir(), 'adrkit-orphan-')))).toThrow(
      /no ADR Kit repository found/,
    );
  });

  it('stays outside the lifecycle: list and instructions surface the count, validate ignores the file', () => {
    const root = makeRepo();
    noteCommand('park a choice', root);
    noteCommand('park another', root);

    expect(listCommand(root)).toContain('2 unshaped notes in adr/notes.md');
    expect(instructionsCommand(root)).toContain('2 unshaped notes in adr/notes.md');

    const result = validateCommand(root, undefined);
    expect(result.valid).toBe(true);
    expect(result.output).not.toContain('notes.md');
  });

  it('the count disappears from list and instructions once the buffer is empty', () => {
    const root = makeRepo();
    noteCommand('temporary', root);
    expect(listCommand(root)).toContain('1 unshaped note in adr/notes.md');
    writeFileSync(notesPath(root), '');
    expect(listCommand(root)).not.toContain('unshaped');
    expect(instructionsCommand(root)).not.toContain('unshaped');
    expect(existsSync(notesPath(root))).toBe(true);
    expect(NOTES_FILE).toBe('notes.md');
  });

  it('instructions surfaces the count on the pending-proposals path too', () => {
    const root = makeRepo();
    noteCommand('buffered choice', root);
    proposeCommand('Use SQLite', root);
    const output = instructionsCommand(root);
    expect(output).toContain('1 unshaped note in adr/notes.md');
    expect(output).toContain('1 proposal pending:');
  });
});

describe('note CLI surface', () => {
  it('dispatches through main and rejects options it does not take', () => {
    const root = makeRepo();
    const cwd = process.cwd();
    process.chdir(root);
    try {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main(['note', 'wired through the CLI']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('wired through the CLI'));
      logSpy.mockRestore();

      // Unsupported options are a mistake, not a hint: the CLI reports them on
      // the error channel with a failing exit code instead of ignoring them.
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      main(['note', 'x', '--reason', 'y']);
      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('adrkit note does not take --reason'));
    } finally {
      process.chdir(cwd);
    }
  });

  it('appears in the shell completions', () => {
    expect(completionCommand('bash')).toContain('note');
    expect(completionCommand('fish')).toContain('-a "note"');
  });
});
