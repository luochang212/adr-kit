import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { implementCommand } from '../src/commands/implement.js';
import { configCommand } from '../src/commands/config.js';
import { recordCommand } from '../src/commands/record.js';
import { initCommand } from '../src/commands/init.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { listCommand } from '../src/commands/list.js';
import { relevantCommand } from '../src/commands/relevant.js';
import { proposeCommand } from '../src/commands/propose.js';
import { rejectCommand } from '../src/commands/reject.js';
import { showCommand } from '../src/commands/show.js';
import { updateCommand } from '../src/commands/update.js';
import { validateCommand } from '../src/commands/validate.js';
import { todayStamp } from '../src/core/adr.js';
import { installedWithNotice, readConfig } from '../src/core/config.js';
import { STANDING_ORDERS_MARKER, standingOrdersSection } from '../src/core/tool-integrations.js';
import { listProposals, listRecords as allRecords } from '../src/core/repository.js';
import { displayWidth } from '../src/core/view-text.js';
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

/** Fill the sole pending draft with real content so `implement` can promote it. */
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

  it('keeps the dogfooded adr/README.md identical to the generated one', () => {
    const root = makeRepo();
    const generated = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    const committed = readFileSync(fileURLToPath(new URL('../adr/README.md', import.meta.url)), 'utf8');
    expect(committed).toBe(generated);
  });

  it('opens the generated README with the failure-mode framing', () => {
    const root = makeRepo();
    const readme = readFileSync(join(root, 'adr', 'README.md'), 'utf8');
    // An agent entering adr/ must meet the why before the rules: the two
    // failure modes are what teach it to recognize the settle moment.
    expect(readme).toContain("repository's memory against two agent failure modes");
    expect(readme.indexOf('failure modes')).toBeLessThan(readme.indexOf('Records follow the lifecycle folders'));
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

  it('refuses record without --decided-by', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['record', 'Use SQLite'], root);
    expect(message).toContain('--decided-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses implement without --decided-by', () => {
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

  it('refuses record without --raised-by once --decided-by is given', () => {
    const root = makeRepo();
    const { message, exitCode } = runMain(['record', 'Use SQLite', '--decided-by', 'human'], root);
    expect(message).toContain('--raised-by is required');
    expect(exitCode).toBe(1);
  });

  it('refuses implement without --raised-by once --decided-by is given', () => {
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

describe('propose and implement', () => {
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

  it('promotes folded sections as Verification and Trade-offs', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    const output = implementCommand('Use SQLite', root, 'human', 'human');
    expect(output).toContain('### Verification');
    expect(output).toContain('### Trade-offs');
    const content = readFileSync(listRecords(root)[0]!.path, 'utf8');
    expect(content).toContain('### Verification');
    expect(content).toContain('### Trade-offs');
    expect(content).not.toContain('### Acceptance criteria');
    expect(content).not.toContain('### Risks');
    expect(validateCommand(root).valid).toBe(true);
  });

  it('enforces the Later changes entry form when validating', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    implementCommand('Use SQLite', root, 'human', 'human');
    const path = listRecords(root)[0]!.path;
    // The old trailing-prose form is the drift the convention replaced.
    writeFileSync(path, readFileSync(path, 'utf8') + '\nADR 1 later changed the terminal command.\n');
    expect(validateCommand(root).output).toContain('amendment note is trailing prose');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        '\nADR 1 later changed the terminal command.\n',
        '\n### Later changes\n\n**Amended by ADR 1:** the terminal command changed; the decision above is unchanged.\n',
      ),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('allows amendment continuations only after a valid entry', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    fillDraft(root);
    implementCommand('Use SQLite', root, 'human', 'human');
    const path = listRecords(root)[0]!.path;
    const content = readFileSync(path, 'utf8');
    const amendment = '**Amended by ADR 1:** the terminal command changed.\n\nThe decision above is unchanged.\n';
    writeFileSync(path, `${content}\n### Later changes\n\n${amendment}`);
    expect(validateCommand(root).valid).toBe(true);

    // A later valid entry must not disguise an unmarked first amendment as
    // a continuation: there is no preceding entry for it to continue.
    writeFileSync(path, `${content}\n### Later changes\n\nThe first amendment lost its opening.\n\n${amendment}`);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('must open "**Amended by ADR N:**"');
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
    expect(output).not.toContain('dropped section(s)');
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

describe('record and show', () => {
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

  it('sizes the show underline by East Asian display width', () => {
    const root = makeRepo();
    recordCommand('训练环境选 WSL2 而非 Windows 原生', root, 'human', 'human');
    const [head, underline] = showCommand('1', root).split('\n');
    expect(head).toContain('训练环境选');
    // Wide characters make the printed path wider than its code-point count;
    // a code-point underline stops short of the text it underlines.
    expect(head.length).toBeLessThan(displayWidth(head));
    expect(underline).toBe('='.repeat(displayWidth(head)));
  });

  it('resolves a numbered record by its title without the number', () => {
    const root = makeRepo();
    recordCommand('训练环境选 WSL2 而非 Windows 原生', root, 'human', 'human');
    // list prints "[1] 训练环境选…" and prose quotes the stripped title, so
    // the stripped form must resolve, alongside the literal H1 title.
    expect(showCommand('训练环境选 WSL2 而非 Windows 原生', root)).toContain(
      'adr/implemented/1-训练环境选',
    );
    expect(showCommand('1 训练环境选 WSL2 而非 Windows 原生', root)).toContain('status: implemented');
  });
});

describe('creation output', () => {
  it('hints at optional paths scoping for retrieval', () => {
    // Scope retrieval (adrkit relevant) only matches records that declare
    // paths:, and field sites wrote none; the creation output is the one
    // moment every author is looking at the record.
    const root = makeRepo();
    expect(proposeCommand('Use SQLite', root)).toContain('paths: [src/**]');
    expect(recordCommand('Use SQLite', root, 'human', 'human')).toContain('paths: [src/**]');
  });
});

describe('templates', () => {
  it('teach the pointer rule against rot-prone facts at write time', () => {
    // The write moment is the only place this discipline is cheap: records
    // are the memory of why, and volatile facts belong to an owner next to
    // the code. A field site rediscovered the rule twice in its first three
    // records; the template states it instead of hoping for rediscovery.
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    expect(readFileSync(pendingDraftPath(root), 'utf8')).toContain('a record that mirrors');
    recordCommand('Use SQLite', root, 'human', 'human');
    expect(showCommand('1', root)).toContain('a record that mirrors');
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
      main(['atlas', '--record', '1', '--diagram']);
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
    expect(out).toContain('note: AGENTS.md does not carry the standing orders');
    expect(out).toContain('Reading architecture decisions');
    expect(out).toContain(join('.agents', 'skills', 'adrkit-init', 'SKILL.md'));
  });

  it('init stays quiet once AGENTS.md carries the section', () => {
    const dir = freshDir('adrkit-note-');
    writeFileSync(join(dir, 'AGENTS.md'), `# mine\n\n${SECTION}`);
    expect(initCommand(dir)).not.toContain('note: AGENTS.md does not carry');
  });

  it('CLAUDE.md alone does not satisfy the check', () => {
    // Claude Code reads AGENTS.md directly since v2.1.277 and no other tool
    // reads CLAUDE.md; a second carrier would double the paste surface, so
    // standing orders in CLAUDE.md alone keep the note visible.
    const dir = freshDir('adrkit-note-');
    writeFileSync(join(dir, 'CLAUDE.md'), SECTION);
    expect(initCommand(dir)).toContain('note: AGENTS.md does not carry');
  });

  it('a reworked section still counts through its rule sentence', () => {
    // The init workflow allows updating "an equivalent section"; a reorganized
    // paste must not turn the note into a nudge to add a duplicate.
    const dir = freshDir('adrkit-note-');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# mine\n\n## Our architecture implemented\n\nRecord an ADR when an architectural choice constrains future work.\n',
    );
    expect(initCommand(dir)).not.toContain('note: AGENTS.md does not carry');
  });

  it('a translated section counts through its command anchor', () => {
    // A localized standing-orders section loses every English anchor — the
    // field finding: a fully Chinese AGENTS.md carrying the real rules tripped
    // the note. CLI invocations survive translation verbatim, and a repo whose
    // AGENTS.md runs `adrkit list` at task start is wired to adr/ however the
    // surrounding prose reads.
    const dir = freshDir('adrkit-note-');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# 规则\n\n## 阅读架构决策记录\n\n编码任务开始时，先跑 `adrkit list`，完整阅读相关记录。\n',
    );
    expect(initCommand(dir)).not.toContain('note: AGENTS.md does not carry');
  });

  it('update reports the missing section and goes quiet once it lands', () => {
    const root = makeRepo();
    expect(updateCommand(root)).toContain('note: AGENTS.md does not carry');
    writeFileSync(join(root, 'AGENTS.md'), SECTION);
    expect(updateCommand(root)).not.toContain('note: AGENTS.md does not carry');
  });

  it('no note for an explicit integrations opt-out', () => {
    const out = initCommand(freshDir('adrkit-note-'), 'none');
    expect(out).not.toContain('note: AGENTS.md does not carry');
  });
});

describe('standing-orders template marker', () => {
  function freshDir(): string {
    const root = mkdtempSync(join(tmpdir(), 'adrkit-marker-'));
    tempDirs.push(root);
    return root;
  }

  const SECTION =
    '## Reading architecture decisions\n\nAt the start of a coding task, run adrkit list.\n';

  it.each([
    ['unmarked local section', SECTION],
    ['current template', standingOrdersSection()],
    ['edited body with current marker', `${SECTION}Local rules.\n${STANDING_ORDERS_MARKER}`],
    ['translated body with current marker', `## 架构决策\n任务开始时运行 adrkit list。\n${STANDING_ORDERS_MARKER}`],
  ])('%s stays quiet across commands and preserves AGENTS.md', (_name, section) => {
    const root = freshDir();
    const path = join(root, 'AGENTS.md');
    writeFileSync(path, section);
    const outputs = [
      initCommand(root), updateCommand(root), listCommand(root), instructionsCommand(root),
      relevantCommand([join(root, 'src', 'main.ts')], root).output,
    ];
    for (const output of outputs) {
      expect(output).not.toContain('note: the standing orders');
      expect(output).not.toContain('note: AGENTS.md does not carry');
    }
    expect(readFileSync(path, 'utf8')).toBe(section);
  });

  it('an old marker asks for comparison before re-stamping across commands', () => {
    const root = freshDir();
    const path = join(root, 'AGENTS.md');
    const section = `${SECTION}\n<!-- adrkit: standing-orders deadbeef -->\n`;
    writeFileSync(path, section);
    const outputs = [
      initCommand(root), updateCommand(root), listCommand(root), instructionsCommand(root),
      relevantCommand([join(root, 'src', 'main.ts')], root).output,
    ];
    for (const output of outputs) {
      expect(output).toContain('different template generation');
      expect(output).toContain(`step 4 of ${join('.agents', 'skills', 'adrkit-init', 'SKILL.md')}`);
      expect(output).toContain('compare the section');
      expect(output).toContain('reconcile any changes, then update the generation marker');
    }
    expect(readFileSync(path, 'utf8')).toBe(section);
  });

  it.each([undefined, '# Project instructions\n'])('a missing section keeps its separate init/update note (%s)', (body) => {
    const root = freshDir();
    if (body !== undefined) writeFileSync(join(root, 'AGENTS.md'), body);
    for (const output of [initCommand(root), updateCommand(root)]) {
      expect(output).toContain('note: AGENTS.md does not carry the standing orders');
      expect(output).not.toContain('note: the standing orders');
    }
    for (const output of [listCommand(root), instructionsCommand(root)]) {
      expect(output).not.toContain('note: the standing orders');
    }
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

  it('instructions re-anchors the purpose at the check-in moment', () => {
    const root = makeRepo();
    expect(instructionsCommand(root)).toContain('memory against drift and forgetting');
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

describe('relevant command', () => {
  /** A minimal parseable record: front matter, title, no sections needed. */
  function recordWith(
    root: string,
    folder: string,
    fileName: string,
    title: string,
    paths?: string,
  ): void {
    const scope = paths === undefined ? '' : `paths: [${paths}]\n`;
    const reason = folder === 'rejected' ? 'reason: too heavy\n' : '';
    writeFileSync(
      join(root, 'adr', folder, fileName),
      `---
status: ${folder === 'archived' ? 'implemented' : folder}
date: 2026-10-12
${reason}${scope}---

# ADR: ${title}
`,
    );
  }

  it('retrieves records scoped to the given file, with the glob that fired', () => {
    const root = makeRepo();
    recordWith(root, 'implemented', '1-storage.md', '1 Use SQLite', 'src/core/**');
    const output = relevantCommand(['src/core/adr.ts'], root).output;
    expect(output).toContain('Implemented — current authority');
    expect(output).toContain('[1] Use SQLite');
    expect(output).toContain('[src/core/**]');
    expect(output).toContain('Archived records are frozen history');
  });

  it('groups scoped proposals and rejections under their reading posture', () => {
    const root = makeRepo();
    recordWith(root, 'proposed', '2026-10-12-cache.md', 'Add Redis cache', 'src/core/**');
    recordWith(root, 'rejected', '2026-10-12-mongo.md', 'Use MongoDB', 'src/**');
    const output = relevantCommand(['src/core/adr.ts'], root).output;
    expect(output).toContain('Proposed — intent');
    expect(output).toContain('Add Redis cache');
    expect(output).toContain('Rejected — anti-patterns');
    expect(output).toContain('Use MongoDB');
  });

  it('never matches records without a paths field and says why', () => {
    const root = makeRepo();
    recordWith(root, 'implemented', '1-untagged.md', '1 Untagged');
    const output = relevantCommand(['src/core/adr.ts'], root).output;
    expect(output).toContain('no records scope src/core/adr.ts');
    expect(output).toContain('not full-text search');
  });

  it('walks a directory argument and matches files under it', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'src', 'payments'), { recursive: true });
    writeFileSync(join(root, 'src', 'payments', 'api.ts'), 'export {};\n');
    recordWith(root, 'implemented', '1-payments.md', '1 Payments boundary', 'src/payments/**');
    const output = relevantCommand(['src/payments'], root).output;
    expect(output).toContain('[1] Payments boundary');
  });

  it('excludes archived records from retrieval', () => {
    const root = makeRepo();
    recordWith(root, 'archived', '1-old.md', '1 Old choice', 'src/core/**');
    const output = relevantCommand(['src/core/adr.ts'], root).output;
    expect(output).toContain('no records scope');
  });

  it('carries a proposal scope through the implement promotion', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = fillDraft(root);
    mkdirSync(join(root, 'src', 'storage'), { recursive: true });
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace(
        'created: 2026-08-19',
        'created: 2026-08-19\npaths: [src/storage/**]',
      ),
    );
    implementCommand('Use SQLite', root, 'agent', 'human');
    const shipped = readFileSync(join(root, 'adr/implemented/1-use-sqlite.md'), 'utf8');
    expect(shipped).toContain('paths:\n  - src/storage/**');
  });
});


describe('commented proposal sections', () => {
  it('refuses to promote an invisible proposal and preserves its source', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const path = fillDraft(root);
    const hidden = readFileSync(path, 'utf8').replace('## Problem', '<!--\n## Problem') + '-->\n';
    writeFileSync(path, hidden);
    expect(validateCommand(root).output).toContain('missing required section "## Problem"');
    expect(() => implementCommand('Use SQLite', root, 'agent', 'human')).toThrow('proposal is not ready');
    expect(readFileSync(path, 'utf8')).toBe(hidden);
    expect(listRecords(root)).toHaveLength(0);
  });
});
