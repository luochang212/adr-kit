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
import { todayStamp } from '../src/core/adr.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-repo-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function draftPath(root: string, fileName: string): string {
  return join(root, 'adr', '.drafts', fileName);
}

/** The path of the sole pending draft (used right after `proposeCommand`). */
function pendingDraftPath(root: string): string {
  const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
  const draft = listing.find((entry) => entry.folder === 'drafts');
  if (draft === undefined) throw new Error('no draft found');
  return draftPath(root, draft.fileName);
}

/** Fill the sole pending draft with real content so `accept` can promote it. */
function fillDraft(root: string): string {
  const file = pendingDraftPath(root);
  const content = `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

We need durable local storage.

## Proposal

Use SQLite.

## Alternatives considered

- **JSON files**: rejected because they do not scale for queries.

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
    expect(existsSync(join(root, 'adr', '.drafts'))).toBe(false);
    // The three-folder ceremony is gone: drafts are created lazily and gitignored.
    expect(existsSync(join(root, 'adr', 'proposed'))).toBe(false);
    expect(existsSync(join(root, 'adr', 'rejected'))).toBe(false);
    const gitignore = readFileSync(join(root, 'adr', '.gitignore'), 'utf8');
    expect(gitignore).toContain('.drafts');
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

  it('states the no-deletion invariant the decision numbering depends on', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    // Deleting a decision reuses its number (nextDecisionNumber derives the next
    // number from the files present), so the generated README must forbid it and
    // point at the command that retires a decision without deleting it.
    expect(readme).toContain('Never delete or modify a decision');
    expect(readme).toContain('adrkit supersede');
  });

  it('documents the created and tags fields in the generated README', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    expect(readme).toContain('created: YYYY-MM-DD');
    expect(readme).toContain('tags: [frontend]');
    expect(readme).toContain('never re-stamped');
  });

  it('documents the decided-by field in the generated README', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    // Collapse whitespace so the assertion pins the rule, not where the
    // generated prose happens to wrap.
    const flat = readme.replace(/\s+/g, ' ');
    expect(flat).toContain('decided-by: human | agent');
    // The generated README is where a repository's readers meet the field, so
    // it must state the single-source boundary rather than a co-signed one.
    expect(flat).toContain('require the caller to declare it');
    expect(flat).toContain('including when a person only let it through');
    expect(flat).toContain('so it does not establish who chose or authorized the decision');
    expect(flat).toContain('The record body is where the nuance lives');
    expect(flat).toContain('not proof of human review');
  });
});

describe('decided-by declaration', () => {
  it('writes the declared value between date and created', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root, 'human');
    const lines = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8').split(
      /\r?\n/,
    );
    expect(lines[1]).toBe('status: accepted');
    expect(lines[2]).toBe(`date: ${todayStamp()}`);
    expect(lines[3]).toBe('decided-by: human');
    expect(lines[4]).toBe(`created: ${todayStamp()}`);
  });

  it('records an autonomous decision as agent', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root, 'agent');
    expect(readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
  });

  it('writes no decided-by into a fresh draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const draft = readFileSync(draftPath(root, `${todayStamp()}-use-sqlite.md`), 'utf8');
    expect(draft).not.toContain('decided-by');
  });
});

describe('the CLI requires an explicit declaration', () => {
  /**
   * Run main inside the repo, capturing the message main prints after it
   * catches. The exit code is read before it is restored, so every assertion
   * can prove the command failed rather than only that it printed a warning.
   */
  function runMain(args: string[], root: string): { message: string; exitCode: number | undefined } {
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (message?: unknown) => {
      errors.push(String(message));
    };
    try {
      process.chdir(root);
      process.exitCode = undefined;
      main(args);
      return { message: errors.join('\n'), exitCode: process.exitCode };
    } finally {
      console.error = originalError;
      process.exitCode = previousExitCode;
      process.chdir(previousCwd);
    }
  }

  it('refuses decide without --decided-by', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['decide', 'Use SQLite'], root);
    expect(message).toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses accept without --decided-by', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const { message, exitCode } = runMain(['accept', 'Use SQLite'], root);
    expect(message).toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('names both accepted values when the declaration is invalid', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['decide', 'Use SQLite', '--decided-by', 'robot'], root);
    expect(message).toContain('must be "human" or "agent", got "robot"');
    expect(exitCode).toBe(1);
  });

  it('states the boundary without inviting a co-signed value', () => {
    const root = makeRepo();
    const { message } = runMain(['decide', 'Use SQLite'], root);
    // The prompt is the only place a caller meets the rule before writing, so
    // it has to carry the real boundary: one source per record, and a person
    // merely letting an agent's choice through does not make it human.
    expect(message).toContain('a person determined the direction');
    expect(message).toContain('changed a proposal');
    expect(message).not.toContain('approved the one you proposed');
  });

  it('records what the caller declared', () => {
    const root = makeRepo();
    runMain(['decide', 'Use SQLite', '--decided-by', 'agent'], root);
    expect(readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
  });

  it('rejects --decided-by on a command that takes no declaration', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['list', '--decided-by', 'human'], root);
    expect(message).toContain('does not take --decided-by');
    expect(message).not.toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });
});

describe('propose and accept', () => {
  it('creates a draft that accept refuses to promote until alternatives are written', () => {
    const root = makeRepo();
    const output = proposeCommand('Use SQLite', root);
    expect(output).toContain('adr/.drafts/');
    const draft = readFileSync(draftPath(root, `${todayStamp()}-use-sqlite.md`), 'utf8');
    expect(draft.split(/\r?\n/)[2]).toBe(`date: ${todayStamp()}`);
    // Drafts are outside the validate surface; the gate is accept.
    expect(validateCommand(root).valid).toBe(true);
    expect(() => acceptCommand('Use SQLite', root, 'human')).toThrow(/Alternatives considered/);
  });

  it('accepts a filled draft and assigns the next decision number', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    const output = acceptCommand('Use SQLite', root, 'human');
    expect(output).toContain('adr/decisions/1-use-sqlite.md');

    const list = JSON.parse(listCommand(root, true)) as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]!.folder).toBe('decisions');
    const accepted = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8');
    expect(accepted.split(/\r?\n/)[2]).toBe(`date: ${todayStamp()}`);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('rejects a draft and leaves no record', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = draftPath(root, `${todayStamp()}-use-sqlite.md`);
    expect(existsSync(file)).toBe(true);
    const output = rejectCommand('Use SQLite', 'we prefer files', root);
    expect(output).toContain('adr/.drafts/');
    expect(output).toContain('reason: we prefer files');
    expect(existsSync(file)).toBe(false);
    expect(listCommand(root, true)).toBe('[]');
  });

  it('rejects a draft without a reason (optional --reason)', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = draftPath(root, `${todayStamp()}-use-sqlite.md`);
    const output = rejectCommand('Use SQLite', undefined, root);
    expect(output).toContain('rejected and discarded draft');
    expect(output).not.toContain('reason:');
    expect(existsSync(file)).toBe(false);
  });

  it('warns when acceptance drops proposal-era sections', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillDraft(root);
    // Plan is a legitimate proposal-era heading that has no place in an
    // accepted decision; accept must not lose it silently.
    writeFileSync(file, readFileSync(file, 'utf8') + '## Plan\n\nPhase 1: swap adapter.\n');
    const output = acceptCommand('Use SQLite', root, 'human');
    expect(output).toContain('warning: dropped section(s)');
    expect(output).toContain('## Plan');
    expect(validateCommand(root).valid).toBe(true);
  });

  it('carries implementation sections through accept instead of dropping them', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillDraft(root);
    writeFileSync(
      file,
      readFileSync(file, 'utf8') + '## Implementation\n\nPR #123: https://github.com/example/repo/pull/123\n',
    );
    const output = acceptCommand('Use SQLite', root, 'human');
    expect(output).not.toContain('warning');
    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const decisionFile = join(root, 'adr', 'decisions', listing[0]!.fileName);
    const content = readFileSync(decisionFile, 'utf8');
    expect(content).toContain('## Implementation');
    expect(content).toContain('PR #123: https://github.com/example/repo/pull/123');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('cli --all flag', () => {
  it('validate <name> --all validates the whole repository', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root, 'human');
    writeFileSync(
      join(root, 'adr', 'decisions', '1-use-sqlite.md'),
      `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

We need durable local storage.

## Decision

Use SQLite.

## Alternatives considered

- JSON files: rejected because they do not scale for queries.

## Consequences

Fast lookups.
`,
    );
    // second, invalid decision must be caught only when the whole repo is checked
    writeFileSync(
      join(root, 'adr', 'decisions', '2-use-redis.md'),
      `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 2 Use Redis

## Problem

## Decision

## Alternatives considered

- Redis: fast.

## Consequences
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
  it('creates an accepted decision directly', () => {
    const root = makeRepo();
    decideCommand('Use SQLite', root, 'human');
    const shown = showCommand('1', root);
    expect(shown).toContain('status: accepted');
    expect(shown).toContain(`date: ${todayStamp()}`);
    expect(shown).toContain('## Decision');
  });

  it('shows a draft when the query matches only a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const shown = showCommand('Use SQLite', root);
    expect(shown).toContain('adr/.drafts/');
    expect(shown).toContain('# ADR: Use SQLite');
    expect(shown).toContain('status: proposed');
  });
});

describe('config context injection', () => {
  function withContext(root: string, context: string): void {
    writeFileSync(join(root, 'adr', 'config.yaml'), `context: |\n${context}\n`);
  }

  it('injects context into a new draft and stays promotable', () => {
    const root = makeRepo();
    withContext(root, '  Tech stack: TypeScript\n  Keep records short.\n');
    proposeCommand('Use SQLite', root);

    const content = readFileSync(pendingDraftPath(root), 'utf8');
    expect(content).toContain('<!-- Project context (adr/config.yaml):');
    expect(content).toContain('Tech stack: TypeScript');
    // 游离注释不破坏解析；填内容后 accept 应能提升
    fillDraft(root);
    expect(() => acceptCommand('Use SQLite', root, 'human')).not.toThrow();
  });

  it('injects context into a new decision', () => {
    const root = makeRepo();
    withContext(root, '  Domain: payments\n');
    decideCommand('Use Postgres', root, 'human');

    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const record = listing.find((entry) => entry.folder === 'decisions');
    const content = readFileSync(join(root, 'adr', 'decisions', record!.fileName), 'utf8');
    expect(content).toContain('Domain: payments');
  });

  it('leaves the template clean when context is unset', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const content = readFileSync(pendingDraftPath(root), 'utf8');
    expect(content).not.toContain('Project context');
  });

  it('drops the context comment when a draft is accepted', () => {
    const root = makeRepo();
    withContext(root, '  Tech stack: TypeScript\n');
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    acceptCommand('Use SQLite', root, 'human');

    const listing = JSON.parse(listCommand(root, true)) as Array<{ folder: string; fileName: string }>;
    const record = listing.find((entry) => entry.folder === 'decisions');
    const content = readFileSync(join(root, 'adr', 'decisions', record!.fileName), 'utf8');
    expect(content).not.toContain('Project context');
    expect(validateCommand(root).valid).toBe(true);
  });
});
