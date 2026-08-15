import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { acceptCommand } from '../src/commands/accept.js';
import { decideCommand } from '../src/commands/decide.js';
import { initCommand } from '../src/commands/init.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { rejectCommand } from '../src/commands/reject.js';
import { showCommand } from '../src/commands/show.js';
import { validateCommand } from '../src/commands/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'openadr-repo-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function fillProposal(root: string): string {
  const path = join(root, 'adr/proposed');
  const name = listCommand(root, true);
  const parsed = JSON.parse(name) as Array<{ fileName: string }>;
  const file = join(path, parsed[0]!.fileName);
  const content = `# ADR: Use SQLite
Status: proposed

## Problem

We need durable local storage.

## Proposal

Use SQLite.

## Alternatives considered

- **JSON files** — rejected because they do not scale for queries.

## Acceptance criteria

Sessions survive restart.

## Risks

Native dependency.
`;
  writeFileSync(file, content);
  return file;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('initCommand', () => {
  it('creates the OpenADR directory layout', () => {
    const root = makeRepo();
    expect(existsSync(join(root, 'adr', 'config.yaml'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'decisions'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'proposed'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'rejected'))).toBe(true);
  });

  it('refuses to initialize twice', () => {
    const root = makeRepo();
    expect(() => initCommand(root)).toThrow(/already exists/);
  });
});

describe('propose and validate', () => {
  it('creates a proposal that fails validation until alternatives are written', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('Alternatives considered');
  });

  it('accepts a filled proposal and assigns the next decision number', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillProposal(root);
    const output = acceptCommand('Use SQLite', root);
    expect(output).toContain('adr/decisions/0001-use-sqlite.md');

    const list = JSON.parse(listCommand(root, true)) as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]!.folder).toBe('decisions');
    expect(validateCommand(root).valid).toBe(true);
  });

  it('rejects a proposal with a reason', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const output = rejectCommand('Use SQLite', 'we prefer files', root);
    expect(output).toContain('adr/rejected/');
    const shown = showCommand('Use SQLite', root);
    expect(shown).toContain('Status: rejected — we prefer files');
  });
});

describe('decide and show', () => {
  it('creates an accepted decision draft directly', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root);
    const shown = showCommand('0001', root);
    expect(shown).toContain('Status: accepted');
    expect(shown).toContain('## Decision');
  });
});
