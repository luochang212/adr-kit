import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { recordCommand } from '../src/commands/record.js';
import { initCommand } from '../src/commands/init.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-git-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function gitInit(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'ADR Kit Test'], { cwd: dir });
  writeFileSync(join(dir, 'init'), 'x');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('git provenance stays out of records', () => {
  it('records no commit field, even inside a git repo', () => {
    const root = makeRepo();
    gitInit(root);
    recordCommand('Use SQLite', root, 'human', 'human');
    // A git hash in the front matter would be a second, unverifiable copy of
    // what history already records (ADR 49): validate names it as an unknown
    // field, so the template must never write one.
    const content = readFileSync(join(root, 'adr', 'implemented', '1-use-sqlite.md'), 'utf8');
    expect(content).not.toContain('commit:');
  });
});
