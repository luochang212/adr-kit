import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { implementCommand } from '../src/commands/implement.js';
import { configCommand } from '../src/commands/config.js';
import { recordCommand } from '../src/commands/record.js';
import { initCommand } from '../src/commands/init.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { rejectCommand } from '../src/commands/reject.js';
import { showCommand } from '../src/commands/show.js';
import { updateCommand } from '../src/commands/update.js';
import { validateCommand } from '../src/commands/validate.js';
import { todayStamp } from '../src/core/adr.js';
import { installedWithNotice, readConfig } from '../src/core/config.js';
import { listProposals, listRecords as allRecords } from '../src/core/repository.js';
import { VERSION } from '../src/version.js';

const tempDirs: string[] = [];
const listRecords = (root: string) => allRecords(root).filter((record) => record.number !== undefined);

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-repo-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function draftPath(root: string, fileName: string): string {
  return join(root, 'adr', 'proposed', fileName);
}

/** The path of the sole pending draft (used right after `proposeCommand`). */
function pendingDraftPath(root: string): string {
  const draft = listProposals(root)[0];
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
    expect(existsSync(join(root, 'adr', 'implemented'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'proposed'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'rejected'))).toBe(true);
    expect(existsSync(join(root, 'adr', 'archived'))).toBe(true);
    expect(existsSync(join(root, 'adr', '.gitignore'))).toBe(false);
  });

  it('writes an empty archive manifest', () => {
    const root = makeRepo();
    const manifest = JSON.parse(readFileSync(join(root, 'adr', 'archived', 'MANIFEST.json'), 'utf8'));
    expect(manifest).toEqual({ version: 1, entries: [] });
  });

  it('refuses to initialize twice', () => {
    const root = makeRepo();
    expect(() => initCommand(root)).toThrow(/already exists/);
  });

  it('does not label implemented as current truth in the generated README', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    expect(readme).not.toContain('current truth');
    expect(readme).toContain('frozen history');
  });

  it('states the no-deletion invariant the decision numbering depends on', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    // Deleting a decision reuses its number (nextDecisionNumber derives the next
    // number from the files present), so the generated README must forbid it and
    // point at the command that retires a decision without deleting it.
    expect(readme).toContain('Never delete a numbered decision');
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
    expect(flat).toContain('raised-by: human | agent');
    expect(flat).toContain('decided-by: human | agent');
    // The generated README is where a repository's readers meet the fields, so
    // it must state the single-source boundary rather than a co-signed one.
    expect(flat).toContain('provenance declarations');
    expect(flat).toContain('not proof of approval');
  });
});

describe('decided-by declaration', () => {
  it('writes both declarations between date and created', () => {
    const root = makeRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    const lines = readFileSync(join(root, 'adr', 'implemented', '1-use-sqlite.md'), 'utf8').split(
      /\r?\n/,
    );
    expect(lines[1]).toBe('status: implemented');
    expect(lines[2]).toBe(`date: ${todayStamp()}`);
    expect(lines[3]).toBe('raised-by: human');
    expect(lines[4]).toBe('decided-by: human');
    expect(lines[5]).toBe(`created: ${todayStamp()}`);
  });

  it('records an autonomous decision as agent', () => {
    const root = makeRepo();
    recordCommand('Use SQLite', root, 'agent', 'human');
    expect(readFileSync(join(root, 'adr', 'implemented', '1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
  });

  it('writes no decided-by into a fresh draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const draft = readFileSync(draftPath(root, `${todayStamp()}-use-sqlite.md`), 'utf8');
    expect(draft).not.toContain('decided-by');
    expect(draft).not.toContain('raised-by');
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
    const { message, exitCode } = runMain(['record', 'Use SQLite'], root);
    expect(message).toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses accept without --decided-by', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const { message, exitCode } = runMain(['implement', 'Use SQLite'], root);
    expect(message).toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('names both implemented values when the declaration is invalid', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['record', 'Use SQLite', '--decided-by', 'robot'], root);
    expect(message).toContain('must be "human" or "agent", got "robot"');
    expect(exitCode).toBe(1);
  });

  it('states the boundary without inviting a co-signed value', () => {
    const root = makeRepo();
    const { message } = runMain(['record', 'Use SQLite'], root);
    // The prompt is the only place a caller meets the rule before writing, so
    // it has to carry the real boundary: one source per record, and a person
    // merely letting an agent's choice through does not make it human.
    expect(message).toContain('a person determined the direction');
    expect(message).toContain('changed a proposal');
    expect(message).not.toContain('approved the one you proposed');
  });

  it('records what the caller declared', () => {
    const root = makeRepo();
    runMain(['record', 'Use SQLite', '--decided-by', 'agent', '--raised-by', 'human'], root);
    const record = readFileSync(join(root, 'adr', 'implemented', '1-use-sqlite.md'), 'utf8');
    expect(record).toContain('decided-by: agent');
    expect(record).toContain('raised-by: human');
  });

  it('rejects --decided-by on a command that takes no declaration', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['list', '--decided-by', 'human'], root);
    expect(message).toContain('does not take --decided-by');
    expect(message).not.toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses decide without --raised-by once --decided-by is given', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['record', 'Use SQLite', '--decided-by', 'human'], root);
    expect(message).toContain('--raised-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses accept without --raised-by once --decided-by is given', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const { message, exitCode } = runMain(['implement', 'Use SQLite', '--decided-by', 'human'], root);
    expect(message).toContain('--raised-by is required');
    expect(exitCode).toBe(1);
  });

  it('rejects --raised-by on a command that takes no declaration', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['list', '--raised-by', 'human'], root);
    expect(message).toContain('does not take --raised-by');
    expect(exitCode).toBe(1);
  });
});

describe('propose and accept', () => {
  it('requires removing a draft-supplied declaration before promotion', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillDraft(root);
    const valid = readFileSync(file, 'utf8');
    const invalid = valid.replace('status: proposed', 'status: proposed\ndecided-by: human');
    writeFileSync(file, invalid);

    expect(() => implementCommand('Use SQLite', root, 'agent', 'human')).toThrow(
      'unshipped records must not include "decided-by"',
    );
    expect(readFileSync(file, 'utf8')).toBe(invalid);
    // A refused promotion writes nothing: the draft is the only record on disk.
    expect(listRecords(root)).toEqual([]);
    expect(listProposals(root)).toHaveLength(1);

    writeFileSync(file, valid);
    implementCommand('Use SQLite', root, 'agent', 'human');
    expect(existsSync(file)).toBe(false);
    expect(readFileSync(join(root, 'adr/implemented/1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('creates a draft that accept refuses to promote until alternatives are written', () => {
    const root = makeRepo();
    const output = proposeCommand('Use SQLite', root);
    expect(output).toContain('adr/proposed/');
    const draft = readFileSync(draftPath(root, `${todayStamp()}-use-sqlite.md`), 'utf8');
    expect(draft.split(/\r?\n/)[2]).toBe(`date: ${todayStamp()}`);
    // Drafts are outside the validate surface; the gate is accept.
    expect(validateCommand(root).valid).toBe(false);
    expect(() => implementCommand('Use SQLite', root, 'human', 'human')).toThrow(/Alternatives considered/);
  });

  it('accepts a filled draft and assigns the next decision number', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    const output = implementCommand('Use SQLite', root, 'human', 'human');
    expect(output).toContain('adr/implemented/1-use-sqlite.md');

    const records = listRecords(root);
    expect(records).toHaveLength(1);
    expect(records[0]!.folder).toBe('implemented');
    const implemented = readFileSync(join(root, 'adr', 'implemented', '1-use-sqlite.md'), 'utf8');
    expect(implemented.split(/\r?\n/)[2]).toBe(`date: ${todayStamp()}`);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('steers a new caller to declare, in both the init and propose output', () => {
    // These lines are the agent's steer at the moment it creates work. Naming
    // only `human` would invite an agent to label its own judgment as human,
    // which is the one thing the declaration exists to prevent.
    const dir = mkdtempSync(join(tmpdir(), 'adrkit-steer-'));
    tempDirs.push(dir);
    const init = initCommand(dir);
    expect(init).toContain('--raised-by human');
    expect(init).toContain('--decided-by human');
    const proposed = proposeCommand('Use SQLite', dir);
    expect(proposed).toContain('--raised-by human');
    expect(proposed).toContain('--decided-by human');
    expect(proposed).toContain('When the work ships');
  });

  it('records the declared value on implemented and never on drafts', () => {
    // The declaration lives in the record itself: a decision carries what the
    // caller supplied, and a draft has no decision to attribute.
    const root = makeRepo();
    recordCommand('Agent call', root, 'agent', 'human');
    proposeCommand('Use SQLite', root);
    expect(listRecords(root)[0]!.decidedBy).toBe('agent');
    expect(listRecords(root)[0]!.raisedBy).toBe('human');
    expect(listProposals(root)[0]!.decidedBy).toBeUndefined();
    expect(listProposals(root)[0]!.raisedBy).toBeUndefined();
  });

  it('rejects a draft and leaves no record', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = draftPath(root, `${todayStamp()}-use-sqlite.md`);
    expect(existsSync(file)).toBe(true);
    fillDraft(root);
    const output = rejectCommand('Use SQLite', 'we prefer files', root);
    expect(output).toContain('adr/rejected/');
    expect(existsSync(file)).toBe(false);
    expect(allRecords(root)[0]?.rejectionReason).toBe('we prefer files');
    expect(listProposals(root)).toEqual([]);
  });

  it('requires a reason before formally rejecting a proposal', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = draftPath(root, `${todayStamp()}-use-sqlite.md`);
    expect(() => rejectCommand('Use SQLite', '', root)).toThrow('--reason');
    expect(existsSync(file)).toBe(true);
  });

  it('warns when acceptance drops proposal-era sections', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillDraft(root);
    // Plan is a legitimate proposal-era heading that has no place in an
    // implemented decision; accept must not lose it silently.
    writeFileSync(file, readFileSync(file, 'utf8') + '## Plan\n\nPhase 1: swap adapter.\n');
    const output = implementCommand('Use SQLite', root, 'human', 'human');
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
    const output = implementCommand('Use SQLite', root, 'human', 'human');
    expect(output).not.toContain('warning');
    const decisionFile = listRecords(root)[0]!.path;
    const content = readFileSync(decisionFile, 'utf8');
    expect(content).toContain('## Implementation');
    expect(content).toContain('PR #123: https://github.com/example/repo/pull/123');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('cli --all flag', () => {
  it('validate <name> --all validates the whole repository', () => {
    const root = makeRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    writeFileSync(
      join(root, 'adr', 'implemented', '1-use-sqlite.md'),
      `---
status: implemented
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
      join(root, 'adr', 'implemented', '2-use-redis.md'),
      `---
status: implemented
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

  it('reports a section whose only content is an unterminated comment', () => {
    const root = makeRepo();
    writeFileSync(
      join(root, 'adr', 'implemented', '1-use-sqlite.md'),
      `---
status: implemented
date: 2026-08-19
raised-by: human
decided-by: human
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

<!--

## Decision

Body.

## Alternatives considered

- JSON files: rejected.

## Consequences

Body.
`,
    );
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    let exitCode: number | undefined;
    process.chdir(root);
    try {
      main(['validate', '--all']);
      exitCode = process.exitCode;
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      spy.mockRestore();
    }
    expect(exitCode).toBe(1);
    expect(logs.join('\n')).toContain('section "## Problem" must contain written content');
  });
});

describe('decide and show', () => {
  it('creates an implemented decision directly', () => {
    const root = makeRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    const shown = showCommand('1', root);
    expect(shown).toContain('status: implemented');
    expect(shown).toContain(`date: ${todayStamp()}`);
    expect(shown).toContain('## Decision');
  });

  it('shows a draft when the query matches only a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const shown = showCommand('Use SQLite', root);
    expect(shown).toContain('adr/proposed/');
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
    expect(() => implementCommand('Use SQLite', root, 'human', 'human')).not.toThrow();
  });

  it('injects context into a new decision', () => {
    const root = makeRepo();
    withContext(root, '  Domain: payments\n');
    recordCommand('Use Postgres', root, 'human', 'human');

    const record = listRecords(root)[0]!;
    const content = readFileSync(record.path, 'utf8');
    expect(content).toContain('Domain: payments');
  });

  it('leaves the template clean when context is unset', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const content = readFileSync(pendingDraftPath(root), 'utf8');
    expect(content).not.toContain('Project context');
  });

  it('drops the context comment when a draft is implemented', () => {
    const root = makeRepo();
    withContext(root, '  Tech stack: TypeScript\n');
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    implementCommand('Use SQLite', root, 'human', 'human');

    const record = listRecords(root)[0]!;
    const content = readFileSync(record.path, 'utf8');
    expect(content).not.toContain('Project context');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('list output', () => {
  it('lists implemented and pending drafts as text', () => {
    const root = makeRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    proposeCommand('Use Postgres', root);
    const output = listCommand(root);
    expect(output).toContain('Implemented');
    expect(output).toContain('adr/implemented/1-use-sqlite.md');
    expect(output).toContain('Proposed');
    expect(output).toContain('adr/proposed/');
  });

  it('points a fresh repository at the two creation commands', () => {
    const root = makeRepo();
    // The empty-repo hint is the first thing a new caller reads, so it names the
    // required declaration rather than a decide command that would now fail.
    expect(listCommand(root)).toContain('--decided-by human');
  });
});

describe('CLI deliberation HTML export', () => {
  it('prints an offline document for a real record without rewriting the source', () => {
    const root = makeRepo();
    recordCommand('Choose storage', root, 'human', 'human');
    const record = listRecords(root)[0]!;
    const source = readFileSync(record.path, 'utf8') + '\n## Deliberation\n\n'
      + '- Q: Storage? [settled]\n  - A: SQLite [settled] (recommended)\n';
    writeFileSync(record.path, source);
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      main(['tree', '1', '--html']);
      expect(output).toHaveBeenCalledTimes(1);
      const html = String(output.mock.calls[0]![0]);
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<h1>1 Choose storage</h1>');
      expect(html).toContain('SQLite');
      expect(html).toContain('id="viewport"');
      expect(html).not.toMatch(/<script[^>]+src=/);
      expect(readFileSync(record.path, 'utf8')).toBe(source);
    } finally {
      output.mockRestore();
      cwd.mockRestore();
    }
  });
});


describe('CLI successive supersession', () => {
  it('validates the chain through the CLI in both modes', () => {
    const root = makeRepo();
    for (const title of ['Use SQLite', 'Use Postgres', 'Use Spanner']) {
      proposeCommand(title, root);
      const draft = fillDraft(root);
      writeFileSync(draft, readFileSync(draft, 'utf8').replace('# ADR: Use SQLite', `# ADR: ${title}`));
      implementCommand(title, root, 'human', 'human');
    }
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    process.chdir(root);
    try {
      main(['supersede', '1', '--by', '2']);
      main(['supersede', '2', '--by', '3']);
      for (const args of [['validate'], ['validate', '1']]) {
        process.exitCode = 0;
        logs.length = 0;
        main(args);
        expect(process.exitCode).toBe(0);
        expect(logs.join('\n')).toMatch(/OK$/);
      }
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      spy.mockRestore();
    }
  });
});

/** Rewrite adr/config.yaml text in place, to simulate repositories configured by other versions. */
function editConfig(root: string, transform: (text: string) => string): void {
  const file = join(root, 'adr', 'config.yaml');
  writeFileSync(file, transform(readFileSync(file, 'utf8')));
}
const SET_STAMP = (version: string) => (text: string) =>
  `${text.replace(/^installed-with:.*\n/m, '')}installed-with: ${version}\n`;
const ADD_OLD_STAMP = SET_STAMP('0.9.0');
const DROP_STAMP = (text: string) => text.replace(/^installed-with:.*\n/m, '');

describe('standing-orders note', () => {
  const SECTION =
    '## Reading architecture decisions\n\nAt the start of a coding task, run adrkit list.\n';

  function freshDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('init notes the missing standing-orders section', () => {
    // The manual-paste step is the one integration state the CLI does not
    // write; without the note, a repo whose agent never ran the init skill
    // loses the task-start reading rules silently.
    const out = initCommand(freshDir('adrkit-note-'));
    expect(out).toContain('note: neither AGENTS.md nor CLAUDE.md carries the standing orders');
    expect(out).toContain('Reading architecture decisions');
    expect(out).toContain(join('.agents', 'skills', 'adrkit-init', 'SKILL.md'));
  });

  it('init stays quiet once AGENTS.md carries the section', () => {
    const dir = freshDir('adrkit-note-');
    writeFileSync(join(dir, 'AGENTS.md'), `# mine\n\n${SECTION}`);
    expect(initCommand(dir)).not.toContain('note: neither');
  });

  it('CLAUDE.md alone satisfies the check', () => {
    const dir = freshDir('adrkit-note-');
    writeFileSync(join(dir, 'CLAUDE.md'), SECTION);
    expect(initCommand(dir)).not.toContain('note: neither');
  });

  it('a reworked section still counts through its rule sentence', () => {
    // The init workflow allows updating "an equivalent section"; a reorganized
    // paste must not turn the note into a nudge to add a duplicate.
    const dir = freshDir('adrkit-note-');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# mine\n\n## Our architecture implemented\n\nRecord an ADR when an architectural choice constrains future work.\n',
    );
    expect(initCommand(dir)).not.toContain('note: neither');
  });

  it('update reports the missing section and goes quiet once it lands', () => {
    const root = makeRepo();
    expect(updateCommand(root)).toContain('note: neither AGENTS.md nor CLAUDE.md');
    writeFileSync(join(root, 'AGENTS.md'), SECTION);
    expect(updateCommand(root)).not.toContain('note: neither');
  });

  it('no note for an explicit integrations opt-out', () => {
    const out = initCommand(freshDir('adrkit-note-'), 'none');
    expect(out).not.toContain('note: neither');
  });
});

describe('integration drift: installed-with stamp and notice', () => {
  it('init stamps the config with the running version', () => {
    const root = makeRepo();
    expect(readConfig(root).installedWith).toBe(VERSION);
  });

  it('update re-stamps the config', () => {
    const root = makeRepo();
    editConfig(root, ADD_OLD_STAMP);
    updateCommand(root);
    expect(readConfig(root).installedWith).toBe(VERSION);
  });

  it('list and instructions suggest adrkit update when the CLI is newer than the stamp', () => {
    const root = makeRepo();
    editConfig(root, ADD_OLD_STAMP);
    expect(listCommand(root)).toContain('run "adrkit update"');
    expect(instructionsCommand(root)).toContain('run "adrkit update"');
  });

  it('an older CLI than the stamp is told to upgrade adr-kit, never to update', () => {
    const root = makeRepo();
    editConfig(root, SET_STAMP('99.0.0'));
    expect(listCommand(root)).toContain('which is older');
    expect(listCommand(root)).toContain('upgrade adr-kit to at least 99.0.0');
    expect(instructionsCommand(root)).toMatch(/older - upgrade adr-kit to at least 99\.0\.0/);
  });

  it('no note when the stamp matches the running version', () => {
    const root = makeRepo();
    expect(listCommand(root)).not.toContain('note:');
    expect(instructionsCommand(root)).not.toContain('note:');
  });

  it('no note for a repository configured before the stamp existed', () => {
    const root = makeRepo();
    editConfig(root, DROP_STAMP);
    expect(readConfig(root).installedWith).toBeUndefined();
    expect(listCommand(root)).not.toContain('note:');
  });

  it('no note when integrations are opted out', () => {
    const root = makeRepo();
    editConfig(root, (text) => `${ADD_OLD_STAMP(text).replace('tools: [ agents ]', 'tools: []')}`);
    expect(listCommand(root)).not.toContain('note:');
  });

  it('config reports installed-with', () => {
    const root = makeRepo();
    expect(configCommand(root)).toContain(`installed-with: ${VERSION}`);
  });

  it('stamping preserves comments and unknown keys', () => {
    const root = makeRepo();
    editConfig(root, (text) => `${ADD_OLD_STAMP(text)}# my own note\nlegacy-key: keep me\n`);
    updateCommand(root);
    const text = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
    expect(text).toContain('# my own note');
    expect(text).toContain('legacy-key: keep me');
    expect(readConfig(root).installedWith).toBe(VERSION);
  });

  it('stays quiet for a stamp that starts like a version but is not one', () => {
    expect(installedWithNotice({ installedWith: '1.2.3.4', tools: ['agents'] }, '1.2.4')).toBeUndefined();
  });

  it('stays quiet for a prerelease stamp of the same version', () => {
    expect(installedWithNotice({ installedWith: '1.2.3-beta', tools: ['agents'] }, '1.2.3')).toBeUndefined();
  });

  it('still notices a genuine mismatch after strict parsing', () => {
    expect(installedWithNotice({ installedWith: '1.2.3', tools: ['agents'] }, '1.2.4')).toContain('adrkit update');
  });

  it('a malformed config does not break list or instructions', () => {
    const root = makeRepo();
    writeFileSync(join(root, 'adr', 'config.yaml'), ['- one', '- two', ''].join('\n'));
    // The notice lookup tolerates the broken file, so the first two commands
    // still work; validate is the one that reports the config error.
    expect(listCommand(root)).not.toContain('note:');
    expect(instructionsCommand(root)).not.toContain('note:');
    expect(validateCommand(root).output).toContain('adr/config.yaml');
  });
});
