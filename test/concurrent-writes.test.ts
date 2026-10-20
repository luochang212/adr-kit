import { fork, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { proposeCommand } from '../src/commands/propose.js';
import { folderPath, writeRecord } from '../src/core/repository.js';

const fixtures = mkdtempSync(join(tmpdir(), 'adrkit-concurrent-'));
const runner = join(fixtures, 'writer.mjs');

beforeAll(() => {
  // Compile the current source into an isolated fixture, so child processes
  // exercise production code without depending on a possibly stale dist/.
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'),
    '-p', resolve('tsconfig.json'), '--outDir', join(fixtures, 'dist'),
    '--declaration', 'false', '--declarationMap', 'false'], { timeout: 20_000 });
  writeFileSync(join(fixtures, 'package.json'), '{"type":"module"}');
  symlinkSync(resolve('node_modules'), join(fixtures, 'node_modules'), 'junction');
  writeFileSync(runner, `
import fs from 'node:fs';
import { join } from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
const [root, action, title, pause] = process.argv.slice(2);
const original = fs.writeFileSync;
fs.writeFileSync = function(path, ...args) {
  if (pause === 'yes' && String(path).endsWith('.md') && String(path).includes('implemented')) {
    process.send('paused');
    const deadline = Date.now() + 10000;
    while (!fs.existsSync(join(root, 'release'))) {
      if (Date.now() > deadline) throw new Error('writer barrier timed out');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    }
  }
  return original.call(this, path, ...args);
};
syncBuiltinESMExports();
try {
  const { recordCommand } = await import('./dist/commands/record.js');
  const { implementCommand } = await import('./dist/commands/implement.js');
  console.log(action === 'record'
    ? recordCommand(title, root, 'agent', 'agent')
    : implementCommand(title, root, 'agent', 'agent'));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`);
});

afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

function writer(root: string, action: string, title: string, pause = false) {
  const child = fork(runner, [root, action, title, pause ? 'yes' : 'no'], {
    silent: true, execArgv: [],
  });
  let output = '';
  child.stdout!.on('data', (data) => { output += String(data); });
  child.stderr!.on('data', (data) => { output += String(data); });
  const paused = new Promise<void>((resolvePaused, reject) => {
    child.once('message', () => resolvePaused());
    child.once('error', reject);
    child.once('exit', () => reject(new Error(`writer exited before barrier: ${output}`)));
  });
  // Only the first writer is expected to reach the barrier.
  if (!pause) void paused.catch(() => {});
  const done = new Promise<{ code: number | null; output: string }>((resolveDone, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolveDone({ code, output }));
  });
  return { paused, done };
}

describe('concurrent decision writes', () => {
  it.each(['different title', 'same title', 'implement'])('rejects a competing %s writer and permits retry', async (scenario) => {
    const root = mkdtempSync(join(fixtures, 'repo-'));
    initCommand(root);
    if (scenario === 'implement') {
      proposeCommand('Other decision', root);
      const dir = folderPath(root, 'proposed');
      const file = readdirSync(dir).find((name) => name.endsWith('.md'))!;
      writeFileSync(join(dir, file), `---
status: proposed
date: 2026-10-20
created: 2026-10-20
---

# ADR: Other decision

## Problem

Need a choice.

## Proposal

Use another option.

## Alternatives considered

- Keep the current option.

## Acceptance criteria

The option works.

## Risks

It costs time.
`);
    }
    const first = writer(root, 'record', 'Use SQLite', true);
    const action = scenario === 'implement' ? 'implement' : 'record';
    const title = scenario === 'same title' ? 'Use SQLite' : 'Other decision';
    try {
      await first.paused;
      const second = await writer(root, action, title).done;
      expect(second.code).toBe(1);
      expect(second.output).toContain('decision number 1 is being written');
      expect(existsSync(join(root, 'adr/.write-1.lock'))).toBe(true);
      if (scenario === 'implement') {
        expect(readdirSync(folderPath(root, 'proposed')).some((name) => name.endsWith('.md'))).toBe(true);
      }
    } finally {
      writeFileSync(join(root, 'release'), '');
      expect((await first.done).code).toBe(0);
    }
    expect(readdirSync(folderPath(root, 'implemented')).filter((name) => name.endsWith('.md')))
      .toEqual(['1-use-sqlite.md']);
    const original = readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8');
    expect(existsSync(join(root, 'adr/.write-1.lock'))).toBe(false);
    expect((await writer(root, action, title).done).code).toBe(0);
    expect(readdirSync(folderPath(root, 'implemented')).filter((name) => name.endsWith('.md'))).toHaveLength(2);
    expect(readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8')).toBe(original);
  });

  it('releases a lock after a failed write and refuses reuse of an archived number', () => {
    const root = mkdtempSync(join(fixtures, 'repo-'));
    initCommand(root);
    writeRecord(root, 'archived', '1-old.md', 'archived');
    expect(() => writeRecord(root, 'implemented', '1-new.md', 'new')).toThrow('already taken by adr/archived/1-old.md');
    expect(existsSync(join(root, 'adr/.write-1.lock'))).toBe(false);
    expect(() => writeRecord(root, 'implemented', '2-new.md', 'new')).not.toThrow();
  });
});
