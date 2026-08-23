import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { parseAdrFile } from '../src/core/adr.js';
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
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    decideCommand('Use SQLite', root);
    // Assert on the parsed record: an all-digit short hash is serialized
    // quoted (`commit: "2281972"`) to stay a string in YAML, so a raw-text
    // regex would flake on ~5% of hashes.
    const record = parseAdrFile(join(root, 'adr', 'decisions', '1-use-sqlite.md'));
    expect(record.commit).toBe(head);
  });

  it('omits the commit field outside a git repo', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root);
    const content = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8');
    expect(content).not.toContain('commit:');
  });
});
