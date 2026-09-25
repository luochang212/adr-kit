import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import type { AdrRecord } from '../src/core/adr.js';
import { implementCommand } from '../src/commands/implement.js';
import { initCommand } from '../src/commands/init.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { showCommand } from '../src/commands/show.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath, listProposals, listRecords, relativePath } from '../src/core/repository.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-regressions-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('regressions', () => {
  it('shows an implemented record without duplicating the number', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-use-sqlite.md'),
      `---
status: implemented
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **JSON**: rejected.

## Consequences

Body.
`,
    );
    const output = listCommand(root);
    expect(output).toContain('[1] Use SQLite');
    expect(output).not.toContain('[1] 1');
  });

  it('accepts CJK slugs in decision file names', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-使用-sqlite.md'),
      `---
status: implemented
date: 2026-08-19
raised-by: human
decided-by: human
created: 2026-08-19
---

# ADR: 1 使用 SQLite

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **JSON**: rejected.

## Consequences

Body.
`,
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('rejects a draft whose file name has an invalid calendar date', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'adr', 'proposed'), { recursive: true });
    writeFileSync(
      join(root, 'adr', 'proposed', '2026-02-31-use-sqlite.md'),
      `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **JSON**: rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    // Drafts are outside the validate surface; the gate is accept.
    expect(() => implementCommand('Use SQLite', root, 'human', 'human')).toThrow(/invalid calendar date/);
  });

  it('rejects a record whose status does not match its folder', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-use-sqlite.md'),
      `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **JSON**: rejected.

## Consequences

Body.
`,
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('not valid in implemented/');
  });

  it('resolves records by slug', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-use-sqlite.md'),
      `---
status: implemented
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **JSON**: rejected.

## Consequences

Body.
`,
    );
    const output = showCommand('use-sqlite', root);
    expect(output).toContain('# ADR: 1 Use SQLite');
  });

  it('rejects titles that already start with a decision number', () => {
    const root = makeRepo();
    expect(() => proposeCommand('1 Use SQLite', root)).toThrow(/must not start with a number/);
  });

  it('numbers implemented without zero padding (1, not 0001)', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const draft = listProposals(root).find((record) => record.title === 'Use SQLite')!;
    writeFileSync(
      draft.path,
      `---
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

- **JSON**: rejected.

## Acceptance criteria

Sessions survive restart.

## Risks

Native dependency.
`,
    );
    const output = implementCommand('Use SQLite', root, 'human', 'human');
    expect(output).toContain('adr/implemented/1-use-sqlite.md');
    const decision = listRecords(root).find((record) => record.folder === 'implemented')!;
    expect(decision.fileName).toBe('1-use-sqlite.md');
    expect(decision.title).toBe('1 Use SQLite');
    const shown = showCommand('1', root);
    expect(shown).toContain('# ADR: 1 Use SQLite');
  });

  it('does not tolerate leading zeros in lookups', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-good.md'),
      `---
status: implemented
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 Good

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **Other**: rejected.

## Consequences

Body.
`,
    );
    expect(() => showCommand('0001', root)).toThrow(/no ADR matches/);
    expect(showCommand('1', root)).toContain('# ADR: 1 Good');
  });

  it('resolves a healthy record even when an unrelated record fails to parse', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-broken.md'),
      '# ADR: 1 Broken\nStatus: superseded\n',
    );
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-good.md'),
      `---
status: implemented
date: 2026-08-19
created: 2026-08-19
---

# ADR: 2 Good

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **Other**: rejected.

## Consequences

Body.
`,
    );
    // Whole-repo reads stay fail-fast...
    expect(() => listRecords(root)).toThrow(/failed to parse/);
    // ...but single-record commands only need the record asked for.
    expect(showCommand('2', root)).toContain('# ADR: 2 Good');
    const result = validateCommand(root, '2');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('failed to parse');
  });

  it('surfaces the parse error when the queried record itself is corrupt', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-broken.md'),
      '# ADR: 1 Broken\nStatus: superseded\n',
    );
    expect(() => showCommand('1', root)).toThrow(/failed to parse.*1-broken\.md/);
    expect(() => showCommand('1-broken.md', root)).toThrow(/failed to parse/);
  });

  it('renders relative paths with POSIX separators on every platform', () => {
    // `show`/`list`/`validate` print relativePath() output. On Windows a plain
    // join() yields `adr\proposed\...`, which breaks the documented path form
    // (and the CLI tests that assert `adr/proposed/`). The path must render
    // with forward slashes regardless of the host platform.
    const record: AdrRecord = {
      folder: 'proposed',
      path: join('adr', 'proposed', '2026-08-21-use-sqlite.md'),
      fileName: '2026-08-21-use-sqlite.md',
      title: 'Use SQLite',
      status: 'proposed',
      date: '2026-08-21',
      sections: [],
    };
    expect(relativePath(record)).toBe('adr/proposed/2026-08-21-use-sqlite.md');
    expect(relativePath(record)).not.toContain('\\');
  });
});

describe('non-regular record paths', () => {
  const windows = process.platform === 'win32';

  it('reports a directory instead of reading it', () => {
    const root = makeRepo();
    mkdirSync(join(folderPath(root, 'implemented'), '1-dir.md'));
    expect(() => listCommand(root)).toThrow(/not a regular file \(directory\)/);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('not a regular file (directory)');
  });

  it.skipIf(windows)('reports a FIFO without blocking on it', () => {
    const root = makeRepo();
    execSync(`mkfifo ${JSON.stringify(join(folderPath(root, 'implemented'), '1-fifo.md'))}`);
    expect(() => listCommand(root)).toThrow(/not a regular file \(fifo\)/);
  });

  it.skipIf(windows)('refuses a path that resolves to a character device', () => {
    const root = makeRepo();
    symlinkSync('/dev/zero', join(folderPath(root, 'implemented'), '1-zero.md'));
    expect(() => listCommand(root)).toThrow(/not a regular file \(character device\)/);
  });

  it.skipIf(windows)('reads a symbolic link to a regular file as a record', () => {
    const root = makeRepo();
    const target = join(root, 'record-stored-elsewhere.md');
    writeFileSync(
      target,
      `---
status: implemented
date: 2026-08-19
raised-by: human
decided-by: human
created: 2026-08-19
---

# ADR: 1 Linked

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **Other**: rejected.

## Consequences

Body.
`,
    );
    symlinkSync(target, join(folderPath(root, 'implemented'), '1-linked.md'));
    expect(listCommand(root)).toContain('[1] Linked');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('cli option surface', () => {
  function runCli(argv: string[], cwd: string): { errors: string[]; exitCode: number | undefined } {
    const previousExit = process.exitCode;
    const previousCwd = process.cwd();
    const errors: string[] = [];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
    try {
      process.chdir(cwd);
      main(argv);
      return { errors, exitCode: process.exitCode };
    } finally {
      process.chdir(previousCwd);
      errorSpy.mockRestore();
      logSpy.mockRestore();
      process.exitCode = previousExit;
    }
  }

  it('rejects an option a command does not take', () => {
    const root = makeRepo();
    const list = runCli(['list', '--tag', 'frontend'], root);
    expect(list.exitCode).toBe(1);
    expect(list.errors.join('\n')).toContain('does not take --tag');

    const tree = runCli(['tree', '1', '--out', 'out.html'], root);
    expect(tree.exitCode).toBe(1);
    expect(tree.errors.join('\n')).toContain('does not take --out');

    const decide = runCli(
      ['record', 'x', '--raised-by', 'human', '--decided-by', 'human', '--tools', 'claude'],
      root,
    );
    expect(decide.exitCode).toBe(1);
    expect(decide.errors.join('\n')).toContain('does not take --tools');
  });

  it('still accepts --out on graph', () => {
    const root = makeRepo();
    const result = runCli(['graph', '--html', '--out', join(root, 'map.html')], root);
    expect(result.errors.join('\n')).not.toContain('does not take');
    expect(existsSync(join(root, 'map.html'))).toBe(true);
  });
});
