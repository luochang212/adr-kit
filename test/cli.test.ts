import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { initCommand } from '../src/commands/init.js';
import { COMMANDS, COMMAND_OPTIONS, OPTION_SPECS, parseArgsOptions } from '../src/core/cli-options.js';

const tempDirs: string[] = [];
let originalCwd: string;
let originalExitCode: number | undefined;

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-cli-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

beforeEach(() => {
  originalCwd = process.cwd();
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
});

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('cli option handling', () => {
  it.each([
    { args: ['1'] }, { args: ['--map', 'unexpected'] },
    { args: ['--record', '1', '--format', 'text', 'extra'] },
  ])('rejects atlas positional arguments without creating output: %j', ({ args }) => {
    const root = makeRepo();
    process.chdir(root);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['atlas', ...args, '--out', 'unexpected.html']);
    expect(process.exitCode).toBe(1);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('does not take positional arguments'));
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('--record'));
    expect(output).not.toHaveBeenCalled();
    expect(existsSync(join(root, 'unexpected.html'))).toBe(false);
  });

  it('rejects the removed --diagram flag', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // parseArgs errors are caught by main like every other usage error, so
    // running dist/cli.js directly prints one line instead of a stack dump.
    main(['atlas', '--record', '1', '--diagram']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown option '--diagram'"));
  });

  it('rejects the removed --json flag as an unknown option', () => {
    const root = makeRepo();
    process.chdir(root);
    // parseArgs runs in strict mode, so a flag this CLI no longer declares is
    // rejected before any command runs: there is no JSON output mode left for a
    // hand-written guard to protect.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['list', '--json']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown option '--json'"));
  });

  it('rejects --decided-by on a command that records no decision', () => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['show', 'anything', '--decided-by', 'human']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('adrkit show does not take --decided-by'),
    );
  });

  it('names no command when the flag lands with no command at all', () => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['--decided-by', 'human']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('adrkit (no command) does not take --decided-by'),
    );
  });

  it('lets --help and --version answer for themselves', () => {
    const root = makeRepo();
    process.chdir(root);
    // Help and version are meta-flags, not commands: they answer and exit
    // successfully, and a stray declaration alongside them does not change that.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['--help']);
    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));

    logSpy.mockClear();
    main(['--version']);
    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledTimes(1);

    logSpy.mockClear();
    main(['--help', '--decided-by', 'human']);
    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });
});

describe('the option spec table is the whole CLI surface', () => {
  function helpText(): string {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['--help']);
    return String(logSpy.mock.calls[0]?.[0] ?? '');
  }

  it('parseArgs declares exactly the spec options', () => {
    expect(Object.keys(parseArgsOptions()).sort()).toEqual(
      OPTION_SPECS.map((spec) => spec.name).sort(),
    );
  });

  it('each command synopsis lists exactly the options that command accepts', () => {
    const help = helpText();
    for (const command of COMMANDS) {
      const line = help
        .split('\n')
        .find((candidate) => candidate.startsWith(`  adrkit ${command} `));
      expect(line, `synopsis for ${command}`).toBeDefined();
      // Whole option tokens only: a substring check would let --allow stand in
      // for --all and hide a moved option.
      const listed = line!.match(/--[a-z][a-z-]*/g) ?? [];
      // --help is answered before dispatch and carries its own global line.
      const accepted = (COMMAND_OPTIONS[command] ?? []).filter((option) => option !== '--help');
      for (const option of accepted) {
        expect(listed, `${command} must list ${option} in its synopsis`).toContain(option);
      }
      for (const option of listed) {
        expect(accepted, `${command} lists ${option}, which the spec does not allow`).toContain(option);
      }
    }
  });

  it('the global synopsis lines carry the short aliases', () => {
    const help = helpText();
    expect(help).toContain('adrkit -h, --help');
    expect(help).toContain('adrkit -V, --version');
  });
});

describe('positional arity', () => {
  it('joins an unquoted multi-word record title instead of dropping words', () => {
    const root = makeRepo();
    process.chdir(root);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['record', 'use', 'postgres', 'for', 'sessions', '--raised-by', 'human', '--decided-by', 'human']);
    expect(process.exitCode).toBeUndefined();
    expect(existsSync(join(root, 'adr/implemented/1-use-postgres-for-sessions.md'))).toBe(true);
    expect(output).toHaveBeenCalledWith(expect.stringContaining('created adr/implemented/1-use-postgres-for-sessions.md'));
    output.mockRestore();
  });

  it('joins an unquoted multi-word note text', () => {
    const root = makeRepo();
    process.chdir(root);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['note', 'first', 'words', 'dropped', 'here']);
    const notes = readFileSync(join(root, 'adr/notes.md'), 'utf8');
    expect(notes).toContain('first words dropped here');
  });

  it.each([
    ['show', ['1', 'extra-arg']],
    ['implement', ['1', 'extra-arg']],
    ['reject', ['1', 'extra-arg', '--reason', 'why']],
    ['archive', ['1', 'extra-arg', '--reason', 'why']],
    ['supersede', ['1', '2', 'extra-arg', '--by', '3']],
    ['completion', ['bash', 'zsh']],
    ['hook', ['install', 'extra']],
    ['init', ['a', 'b']],
  ])('rejects extra positional arguments on %s', (command, args) => {
    const root = makeRepo();
    // Every command runs from its own throwaway repository: a regression that
    // let an argument through must not touch the developer's checkout.
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main([command, ...args]);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/takes (one name|at most one path)/));
    errorSpy.mockRestore();
  });

  it.each(['list', 'status', 'instructions', 'config'])('rejects any positional argument on %s', (command) => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main([command, 'stray']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(`adrkit ${command} takes no positional arguments`));
    errorSpy.mockRestore();
  });

  it('rejects a record name combined with --all on validate', () => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['validate', '1', '--all']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('validate takes either a record name or --all, not both'),
    );
    errorSpy.mockRestore();
  });

  it('rejects two names on validate', () => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['validate', '1', '2']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('validate takes one name'));
    errorSpy.mockRestore();
  });
});
