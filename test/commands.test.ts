import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
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
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-repo-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function fillProposal(root: string): string {
  const path = join(root, 'adr', 'proposed');
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
  it('creates the ADR Kit directory layout', () => {
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

  it('does not label decisions as current truth in the generated README', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    expect(readme).not.toContain('current truth');
    expect(readme).toContain('immutable history');
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

  it('warns when acceptance drops proposal-era sections', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillProposal(root);
    // Plan is a legitimate proposal-era heading (record-format.md) that has no
    // place in an accepted decision; accept must not lose it silently.
    writeFileSync(file, readFileSync(file, 'utf8') + '## Plan\n\nPhase 1: swap adapter.\n');
    const output = acceptCommand('Use SQLite', root);
    expect(output).toContain('warning: dropped section(s)');
    expect(output).toContain('## Plan');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('cli --all flag', () => {
  it('validate <name> --all validates the whole repository', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillProposal(root);
    // second, invalid proposal must be caught only when the whole repo is checked
    writeFileSync(
      join(root, 'adr', 'proposed', '2026-08-18-use-redis.md'),
      `# ADR: Use Redis
Status: proposed

## Problem

## Proposal

## Alternatives considered

- Redis: fast.

## Acceptance criteria

## Risks
`,
    );

    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    process.chdir(root);
    try {
      main(['validate', 'use-sqlite', '--all']);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      spy.mockRestore();
    }
    expect(logs.join('\n')).toContain('must contain written content');
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

describe('config context injection', () => {
  function withContext(root: string, context: string): void {
    writeFileSync(join(root, 'adr', 'config.yaml'), `context: |\n${context}\n`);
  }

  function proposalPath(root: string): string {
    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const record = listing.find((entry) => entry.folder === 'proposed');
    if (record === undefined) throw new Error('no proposal found');
    return join(root, 'adr', 'proposed', record.fileName);
  }

  it('injects context into a new proposal and stays valid', () => {
    const root = makeRepo();
    withContext(root, '  Tech stack: TypeScript\n  Keep records short.\n');
    proposeCommand('Use SQLite', root);

    const content = readFileSync(proposalPath(root), 'utf8');
    expect(content).toContain('<!-- Project context (adr/config.yaml):');
    expect(content).toContain('Tech stack: TypeScript');
    // 游离注释不破坏解析；填写内容后应通过校验
    fillProposal(root);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('injects context into a new decision draft', () => {
    const root = makeRepo();
    withContext(root, '  Domain: payments\n');
    decideCommand('Use Postgres', root);

    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const record = listing.find((entry) => entry.folder === 'decisions');
    const content = readFileSync(join(root, 'adr', 'decisions', record!.fileName), 'utf8');
    expect(content).toContain('Domain: payments');
  });

  it('leaves the template clean when context is unset', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const content = readFileSync(proposalPath(root), 'utf8');
    expect(content).not.toContain('Project context');
  });

  it('drops the context comment when a proposal is accepted', () => {
    const root = makeRepo();
    withContext(root, '  Tech stack: TypeScript\n');
    proposeCommand('Use SQLite', root);
    fillProposal(root);
    acceptCommand('Use SQLite', root);

    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const record = listing.find((entry) => entry.folder === 'decisions');
    const content = readFileSync(join(root, 'adr', 'decisions', record!.fileName), 'utf8');
    expect(content).not.toContain('Project context');
    expect(validateCommand(root).valid).toBe(true);
  });
});
