import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { initCommand } from '../src/commands/init.js';
import { relevantCommand } from '../src/commands/relevant.js';
import { gitChangedPaths } from '../src/core/git.js';
import { candidatePaths, relevantRecords } from '../src/core/relevant.js';
import { completionCommand } from '../src/commands/completion.js';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof fs>();
  return { ...original, readdirSync: vi.fn(original.readdirSync), statSync: vi.fn(original.statSync) };
});
const actualFs = await vi.importActual<typeof fs>('node:fs');

const roots: string[] = [];
const originalCwd = process.cwd();
const originalExit = process.exitCode;
function makeRepo(): string {
  const root = fs.mkdtempSync(join(tmpdir(), 'adrkit-context-'));
  roots.push(root);
  initCommand(root, 'none');
  return root;
}
function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function gitInit(root: string, commit = true): void {
  git(root, 'init', '-q');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'user.email', 'fixture@example.test');
  if (commit) { git(root, 'add', '-A'); git(root, 'commit', '-qm', 'initial'); }
}
function file(root: string, path: string, content = 'initial\n'): void {
  fs.mkdirSync(join(root, path, '..'), { recursive: true });
  fs.writeFileSync(join(root, path), content);
}
function record(root: string, n: number, scope?: string): void {
  file(root, `adr/implemented/${n}-fixture.md`, `---\nstatus: implemented\ndate: 2026-10-14\n${scope === undefined ? '' : `paths: [${JSON.stringify(scope)}]\n`}---\n\n# ADR: ${n} Fixture ${n}\n`);
}
afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = originalExit;
  vi.restoreAllMocks();
  vi.mocked(fs.readdirSync).mockReset().mockImplementation(actualFs.readdirSync);
  vi.mocked(fs.statSync).mockReset().mockImplementation(actualFs.statSync);
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Git change context', () => {
  it('separates index, working tree and untracked inputs, and honors ignored files', () => {
    const root = makeRepo();
    file(root, 'src/index.ts'); file(root, 'src/work.ts'); file(root, '.gitignore', 'ignored/\n');
    record(root, 1, 'src/index.ts'); record(root, 2, 'src/work.ts'); record(root, 3, 'src/new.ts');
    gitInit(root);
    file(root, 'src/index.ts', 'staged\n'); git(root, 'add', 'src/index.ts');
    file(root, 'src/work.ts', 'unstaged\n'); file(root, 'src/new.ts'); file(root, 'ignored/new.ts');
    expect(gitChangedPaths(root, { staged: true })).toEqual(['src/index.ts']);
    expect(gitChangedPaths(root, { base: 'HEAD' })).toEqual(['src/index.ts', 'src/new.ts', 'src/work.ts']);
    const staged = relevantCommand([], root, { staged: true });
    expect(staged.output).toContain('[1] Fixture 1');
    expect(staged.output).not.toContain('[2] Fixture 2');
    expect(staged.complete).toBe(true);
    const working = relevantCommand([], root, { base: 'HEAD' });
    for (const n of [1, 2, 3]) expect(working.output).toContain(`[${n}] Fixture ${n}`);
  });

  it('includes deletion and both rename endpoints, even when the new file is untracked', () => {
    const root = makeRepo();
    file(root, 'old/name.ts'); file(root, 'deleted.ts');
    record(root, 1, 'old/**'); record(root, 2, 'new/**'); record(root, 3, 'deleted.ts');
    gitInit(root);
    fs.mkdirSync(join(root, 'new')); fs.renameSync(join(root, 'old/name.ts'), join(root, 'new/name.ts'));
    fs.rmSync(join(root, 'deleted.ts'));
    expect(gitChangedPaths(root, { base: 'HEAD' })).toEqual(['deleted.ts', 'new/name.ts', 'old/name.ts']);
    git(root, 'add', '-A');
    const staged = relevantCommand([], root, { staged: true });
    for (const n of [1, 2, 3]) expect(staged.output).toContain(`[${n}] Fixture ${n}`);
  });

  it.skipIf(process.platform === 'win32')('preserves newlines, Unicode, spaces and option-like file names', () => {
    const root = makeRepo();
    const paths = ['src/line\nbreak.ts', 'src/中文 文件.ts', '--odd.ts'];
    paths.forEach((path) => file(root, path));
    record(root, 1, 'src/**'); record(root, 2, '--odd.ts');
    gitInit(root);
    paths.forEach((path) => file(root, path, 'changed\n'));
    expect(gitChangedPaths(root, { base: 'HEAD' })).toEqual([...paths].sort());
    const output = relevantCommand([], root, { base: 'HEAD' }).output;
    expect(output).toContain('[1] Fixture 1'); expect(output).toContain('[2] Fixture 2');
  });

  it('compares the supplied commit directly rather than choosing a merge base', () => {
    const root = makeRepo(); file(root, 'old.ts'); gitInit(root);
    const base = git(root, 'rev-parse', 'HEAD').trim();
    file(root, 'committed.ts'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'later');
    expect(gitChangedPaths(root, { base })).toEqual(['committed.ts']);
    expect(gitChangedPaths(root, { base: 'HEAD' })).toEqual([]);
  });

  it('supports an unborn index and clearly reports an empty diff', () => {
    const root = makeRepo(); record(root, 1, 'src/**'); gitInit(root, false);
    file(root, 'src/new.ts'); git(root, 'add', 'src/new.ts');
    expect(relevantCommand([], root, { staged: true }).output).toContain('[1] Fixture 1');
    git(root, 'add', '-A'); git(root, 'commit', '-qm', 'initial');
    const output = relevantCommand([], root, { staged: true }).output;
    expect(output).toContain('no changed paths'); expect(output).toContain('does not mean no decisions apply');
  });

  it('normalizes from nested ADR roots and nested caller directories, excluding sibling paths', () => {
    const top = fs.mkdtempSync(join(tmpdir(), 'adrkit-nested-')); roots.push(top);
    const root = join(top, 'project'); initCommand(root, 'none');
    file(root, 'src/in.ts'); file(top, 'sibling/src/out.ts'); record(root, 1, 'src/**');
    gitInit(top); file(root, 'src/in.ts', 'changed\n'); file(top, 'sibling/src/out.ts', 'changed\n');
    expect(gitChangedPaths(root, { base: 'HEAD' })).toEqual(['src/in.ts']);
    expect(relevantCommand([], join(root, 'src'), { base: 'HEAD' }).output).toContain('[1] Fixture 1');
  });

  it('does not expand Git file inputs into directories after a file-to-directory change', () => {
    const root = makeRepo(); file(root, 'item'); record(root, 1, 'item/ignored.txt'); gitInit(root);
    fs.rmSync(join(root, 'item')); file(root, 'item/ignored.txt'); file(root, '.gitignore', 'item/\n');
    const result = relevantCommand([], root, { base: 'HEAD' });
    expect(result.output).not.toContain('[1] Fixture 1');
  });

  it('reports missing Git and invalid refs without returning a false empty result', () => {
    const root = makeRepo();
    expect(() => relevantCommand([], root, { staged: true })).toThrow(/cannot read Git changes/);
    gitInit(root);
    expect(() => relevantCommand([], root, { base: 'not-a-ref' })).toThrow(/base "not-a-ref"/);
    expect(() => relevantCommand([], root, { base: '--help' })).toThrow(/cannot read Git changes/);
    expect(() => relevantCommand([], root, { base: 'HEAD; touch surprise' })).toThrow();
    expect(fs.existsSync(join(root, 'surprise'))).toBe(false);
  });
});

describe('Scope completeness', () => {
  it('reports unscoped records even when another record matches', () => {
    const root = makeRepo(); record(root, 1, 'src/**'); record(root, 2);
    const result = relevantCommand(['src/future.ts'], root);
    expect(result.output).toContain('[1] Fixture 1');
    expect(result.output).toContain('1 active record(s) have no paths');
    expect(result.output).toContain('adrkit list'); expect(result.complete).toBe(true);
  });

  it('never reads malformed archived records but fails on malformed active records', () => {
    const root = makeRepo(); record(root, 1, 'src/**');
    file(root, 'adr/archived/2-broken.md', 'not a record');
    expect(relevantCommand(['src/future.ts'], root).output).toContain('[1] Fixture 1');
    file(root, 'adr/rejected/2026-10-14-broken.md', 'not a record');
    expect(() => relevantCommand(['src/future.ts'], root)).toThrow(/adr[/\\]rejected/);
  });

  it('marks truncated walks as partial and preserves matches with a non-zero CLI status', () => {
    const root = makeRepo(); record(root, 1, 'large/**');
    fs.mkdirSync(join(root, 'large'));
    for (let i = 0; i < 2001; i++) file(root, `large/${i}.ts`);
    const result = relevantCommand(['large'], root);
    expect(result.complete).toBe(false); expect(result.output).toContain('[1] Fixture 1');
    expect(result.output).toContain('truncated after 2000 files'); expect(result.output).toContain('results are partial');
    process.chdir(root); process.exitCode = undefined;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['relevant', 'large']);
    expect(process.exitCode).toBe(1); expect(log).toHaveBeenCalledWith(expect.stringContaining('[1] Fixture 1'));
  });

  it('does not mark exactly 2000 files as truncated and skips intentional exclusions', () => {
    const root = makeRepo(); fs.mkdirSync(join(root, 'large'));
    for (let i = 0; i < 2000; i++) file(root, `large/${i}.ts`);
    file(root, 'large/.git/extra'); file(root, 'large/node_modules/extra');
    expect(candidatePaths(root, 'large', root).diagnostics).toEqual([]);
  });

  it('reports a deterministic unreadable-directory error while retaining other matches', () => {
    const root = makeRepo(); record(root, 1, 'good/**'); file(root, 'good/file');
    fs.mkdirSync(join(root, 'blocked'));
    const read = actualFs.readdirSync;
    vi.mocked(fs.readdirSync).mockImplementation(((path: string, options: unknown) => {
      if (String(path) === join(root, 'blocked')) throw Object.assign(new Error('access denied'), { code: 'EACCES' });
      return read(path, options as never);
    }) as typeof fs.readdirSync);
    const result = relevantCommand(['good', 'blocked'], root);
    expect(result.complete).toBe(false); expect(result.output).toContain('[1] Fixture 1');
    expect(result.output).toContain('blocked: cannot read directory: access denied');
  });

  it('distinguishes planned missing paths from inspection failures', () => {
    const root = makeRepo(); record(root, 1, 'src/**');
    expect(relevantCommand(['src/future.ts'], root).complete).toBe(true);
    const stat = actualFs.statSync;
    vi.mocked(fs.statSync).mockImplementation(((path: string, options: unknown) => {
      if (String(path) === join(root, 'blocked')) throw Object.assign(new Error('access denied'), { code: 'EACCES' });
      return stat(path, options as never);
    }) as typeof fs.statSync);
    const result = relevantRecords(root, ['blocked'], root);
    expect(result.diagnostics[0]?.message).toContain('cannot inspect path');
  });
});

describe('Change input CLI contract', () => {
  it('rejects conflicting and missing inputs', () => {
    const root = makeRepo();
    for (const args of [[], ['--base', 'HEAD', '--staged'], ['file.ts', '--staged'], ['file.ts', '--base', 'HEAD'], ['--base', '']]) {
      process.chdir(root); process.exitCode = undefined;
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      main(['relevant', ...args]); expect(process.exitCode).toBe(1); expect(error).toHaveBeenCalled();
      error.mockRestore();
    }
  });

  it('accepts staged input through dispatch and rejects --staged on another command', () => {
    const root = makeRepo(); gitInit(root); process.chdir(root); process.exitCode = undefined;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['relevant', '--staged']); expect(process.exitCode).toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('staged changes only'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    main(['list', '--staged']); expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('does not take --staged'));
  });

  it('offers both modes and a value-taking base option in all shells', () => {
    expect(completionCommand('bash')).toContain('relevant) option="--base --staged --help"');
    expect(completionCommand('zsh')).toMatch(/relevant\).*--base=.*--staged/);
    expect(completionCommand('fish')).toContain('relevant" -l base -x');
    expect(completionCommand('fish')).toContain('relevant" -l staged');
  });
});
