import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { initCommand } from '../src/commands/init.js';

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
  it('rejects the removed --json flag as an unknown option', () => {
    const root = makeRepo();
    process.chdir(root);
    // parseArgs runs in strict mode, so a flag this CLI no longer declares is
    // rejected before any command runs: there is no JSON output mode left for a
    // hand-written guard to protect.
    expect(() => main(['list', '--json'])).toThrow(/Unknown option '--json'/);
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
