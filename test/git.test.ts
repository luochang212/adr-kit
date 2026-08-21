import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { decideCommand } from '../src/commands/decide.js';
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

describe('git commit stamping', () => {
  it('stamps the short HEAD hash on decide inside a git repo', () => {
    const root = makeRepo();
    gitInit(root);
    decideCommand('Use SQLite', root);
    const content = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8');
    expect(content).toMatch(/^commit: [0-9a-f]{7,40}$/m);
  });

  it('omits the commit field outside a git repo', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root);
    const content = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8');
    expect(content).not.toContain('commit:');
  });
});
