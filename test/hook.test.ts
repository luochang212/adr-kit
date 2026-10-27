import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { initCommand } from '../src/commands/init.js';
import { hookInstallCommand, hookRunCommand, hookUninstallCommand } from '../src/commands/hook.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const parent = mkdtempSync(join(tmpdir(), 'adrkit-hook-'));
  tempDirs.push(parent);
  const root = join(parent, 'repo');
  mkdirSync(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  initCommand(root);
  return root;
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function write(path: string, text: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text);
}

/** A citation the repository scan would read, assembled so this file does not count as one. */
function cite(number: number): string {
  return `// @${'adr'} ${number}\n`;
}

function decision(paths: readonly string[]): string {  return `---
status: implemented
date: 2026-10-22
raised-by: human
decided-by: human
created: 2026-10-22
paths:
${paths.map((path) => `  - ${path}`).join('\n')}
---

# ADR: 1 Test decision

## Problem

Something leaked.

## Decision

Use SQLite.

## Alternatives considered

A file per session.

## Consequences

One store.
`;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('pre-commit hook management', () => {
  it('installs a managed hook and removes it again', () => {
    const root = makeRepo();
    const message = hookInstallCommand(root, join(root, 'bin', 'adrkit.js'));
    expect(message).toContain('installed the pre-commit hook');
    const file = join(root, '.git', 'hooks', 'pre-commit');
    const script = readFileSync(file, 'utf8');
    expect(script).toContain('# adrkit: managed pre-commit hook');
    expect(script).toContain('hook run');
    expect(existsSync(file)).toBe(true);
    expect(hookUninstallCommand(root)).toContain('removed the pre-commit hook');
    expect(existsSync(file)).toBe(false);
  });

  // Executing the raw script needs a POSIX shell; on Windows Git runs hooks
  // through its own sh, which this test cannot reach from Node's PATH.
  const itRunsScript = process.platform === 'win32' ? it.skip : it;
  itRunsScript('fails closed with a named remedy when the pinned checker is gone', () => {
    const root = makeRepo();
    const entry = join(root, 'bin', 'adrkit.js');
    hookInstallCommand(root, entry);
    expect(existsSync(entry)).toBe(false);
    let failure: { status: number | null; stderr: string } | undefined;
    try {
      execFileSync('sh', [join(root, '.git', 'hooks', 'pre-commit')], { encoding: 'utf8' });
    } catch (error) {
      failure = error as { status: number | null; stderr: string };
    }
    expect(failure?.status).toBe(1);
    expect(failure?.stderr).toContain('adrkit hook uninstall');
    expect(failure?.stderr).toContain('git commit --no-verify');
  });

  itRunsScript('runs the check from a nested ADR root, not the repository root', () => {
    const parent = mkdtempSync(join(tmpdir(), 'adrkit-hook-nested-'));
    tempDirs.push(parent);
    const repo = join(parent, 'repo');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    const adrRoot = join(repo, 'docs');
    mkdirSync(adrRoot);
    initCommand(adrRoot);
    // A stub stands in for the CLI: it reports the directory the hook runs in.
    const stub = join(repo, 'stub.mjs');
    writeFileSync(stub, 'process.stdout.write(process.cwd());\n');
    hookInstallCommand(adrRoot, stub);
    // Git runs a hook from the repository root, where adr/ is not visible.
    const output = execFileSync('sh', [join(repo, '.git', 'hooks', 'pre-commit')], {
      cwd: repo,
      encoding: 'utf8',
    });
    expect(output.trim()).toBe(realpathSync(adrRoot));
  });

  it('reads staged records under a nested ADR root', () => {
    const parent = mkdtempSync(join(tmpdir(), 'adrkit-hook-nested-record-'));
    tempDirs.push(parent);
    const repo = join(parent, 'repo');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    const adrRoot = join(repo, 'docs');
    mkdirSync(adrRoot);
    initCommand(adrRoot);
    write(
      join(adrRoot, 'adr', 'implemented', '1-test.md'),
      decision(['src/a.ts']).replace('Something leaked.', '<!-- scratch -->'),
    );
    execFileSync('git', ['add', '-A'], { cwd: repo });
    const result = hookRunCommand(adrRoot);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('must contain written content');
    expect(result.output).toContain('adr/implemented/1-test.md');
  });

  it('refuses to replace or remove a hook it does not manage', () => {
    const root = makeRepo();
    const file = join(root, '.git', 'hooks', 'pre-commit');
    mkdirSync(join(root, '.git', 'hooks'), { recursive: true });
    writeFileSync(file, '#!/bin/sh\necho mine\n');
    expect(() => hookInstallCommand(root, join(root, 'bin', 'adrkit.js'))).toThrow(/not managed by adr-kit/);
    expect(() => hookUninstallCommand(root)).toThrow(/not managed by adr-kit/);
    expect(readFileSync(file, 'utf8')).toContain('echo mine');
  });

  it('passes and names the decisions governing the staged files', () => {
    const root = makeRepo();
    write(join(root, 'adr', 'implemented', '1-test.md'), decision(['src/a.ts']));
    write(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    git(root, 'add', '-A');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('Governed by active decisions');
    expect(result.output).toContain('[1] Test decision');
    expect(result.output).toContain('[src/a.ts]');
    expect(result.output).toContain('record it ("adrkit record")');
  });

  it('passes with a prompt when no record scopes the staged files', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    git(root, 'add', '-A');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(true);
    expect(result.output).toContain('No active record scopes the staged files');
  });

  it('fails on an invalid staged record', () => {
    const root = makeRepo();
    write(join(root, 'adr', 'implemented', '1-test.md'), decision(['src/a.ts']).replace('Something leaked.', '<!-- scratch -->'));
    git(root, 'add', '-A');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('must contain written content');
    expect(result.output).toContain('adr/implemented/1-test.md');
  });

  it('fails on a staged citation to a decision that does not exist', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), `${cite(99)}export const a = 1;\n`);
    git(root, 'add', '-A');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('cites ADR 99, which does not exist');
  });

  it('fails on a staged deletion of a numbered decision', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    write(join(root, 'adr', 'implemented', '1-test.md'), decision(['src/a.ts']));
    git(root, 'add', '-A');
    git(root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'add the decision');
    git(root, 'rm', '-q', 'adr/implemented/1-test.md');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('adr/implemented/1-test.md: staged deletion of a numbered decision');
    expect(result.output).toContain('"adrkit archive"');
  });

  it('allows a staged rename that keeps the decision number', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    write(join(root, 'adr', 'implemented', '1-test.md'), decision(['src/a.ts']));
    git(root, 'add', '-A');
    git(root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'add the decision');
    git(root, 'mv', 'adr/implemented/1-test.md', 'adr/implemented/1-renamed.md');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(true);
  });

  it('reads the staged blob, not the working tree', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), `${cite(99)}export const a = 1;\n`);
    git(root, 'add', '-A');
    // Fix the file without staging the fix: the commit would carry the bad
    // citation, so the hook must still fail.
    writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    const result = hookRunCommand(root);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('cites ADR 99');
  });

  it('stays quiet outside an ADR repository and with nothing staged', () => {
    const parent = mkdtempSync(join(tmpdir(), 'adrkit-hook-plain-'));
    tempDirs.push(parent);
    execFileSync('git', ['init', '-q'], { cwd: parent });
    expect(hookRunCommand(parent)).toEqual({ ok: true, output: '' });
    const root = makeRepo();
    expect(hookRunCommand(root)).toEqual({ ok: true, output: '' });
  });

  it('sets a failing exit code through the CLI, which is what Git blocks on', () => {
    const root = makeRepo();
    write(join(root, 'src', 'a.ts'), `${cite(99)}export const a = 1;\n`);
    git(root, 'add', '-A');
    const originalCwd = process.cwd();
    const originalExitCode = process.exitCode;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      process.chdir(root);
      process.exitCode = undefined;
      main(['hook', 'run']);
      expect(process.exitCode).toBe(1);
      expect(log).toHaveBeenCalled();
    } finally {
      process.chdir(originalCwd);
      process.exitCode = originalExitCode;
      log.mockRestore();
    }
  });
});
