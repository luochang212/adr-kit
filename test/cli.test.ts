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

describe('cli --json handling', () => {
  it('rejects --json on commands that do not support it instead of ignoring it', () => {
    const root = makeRepo();
    process.chdir(root);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['show', 'anything', '--json']);
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('adrkit show does not support --json'),
    );
  });

  it('keeps --json working on commands that support it', () => {
    const root = makeRepo();
    process.chdir(root);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['list', '--json']);
    expect(process.exitCode).toBeUndefined();
    const output = logSpy.mock.calls[0]?.[0] as string;
    expect(() => JSON.parse(output)).not.toThrow();
  });
});
