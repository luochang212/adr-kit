import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { AdrRecord } from '../src/core/adr.js';
import { acceptCommand } from '../src/commands/accept.js';
import { initCommand } from '../src/commands/init.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { showCommand } from '../src/commands/show.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath, listDrafts, listRecords, relativePath } from '../src/core/repository.js';

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
  it('shows accepted decisions without duplicating the number', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `---
status: accepted
date: 2026-08-19
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
      join(folderPath(root, 'decisions'), '1-使用-sqlite.md'),
      `---
status: accepted
date: 2026-08-19
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
    mkdirSync(join(root, 'adr', '.drafts'), { recursive: true });
    writeFileSync(
      join(root, 'adr', '.drafts', '2026-02-31-use-sqlite.md'),
      `---
status: proposed
date: 2026-08-19
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
    expect(() => acceptCommand('Use SQLite', root)).toThrow(/invalid calendar date/);
  });

  it('rejects a record whose status does not match its folder', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `---
status: proposed
date: 2026-08-19
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
    expect(result.output).toContain('not a durable decision status');
  });

  it('resolves records by slug', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `---
status: accepted
date: 2026-08-19
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

  it('numbers decisions without zero padding (1, not 0001)', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const draft = listDrafts(root).find((record) => record.title === 'Use SQLite')!;
    writeFileSync(
      draft.path,
      `---
status: proposed
date: 2026-08-19
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
    const output = acceptCommand('Use SQLite', root);
    expect(output).toContain('adr/decisions/1-use-sqlite.md');
    const decision = listRecords(root).find((record) => record.folder === 'decisions')!;
    expect(decision.fileName).toBe('1-use-sqlite.md');
    expect(decision.title).toBe('1 Use SQLite');
    const shown = showCommand('1', root);
    expect(shown).toContain('# ADR: 1 Use SQLite');
  });

  it('does not tolerate leading zeros in lookups', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-good.md'),
      `---
status: accepted
date: 2026-08-19
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
      join(folderPath(root, 'decisions'), '1-broken.md'),
      '# ADR: 1 Broken\nStatus: superseded\n',
    );
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-good.md'),
      `---
status: accepted
date: 2026-08-19
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
      join(folderPath(root, 'decisions'), '1-broken.md'),
      '# ADR: 1 Broken\nStatus: superseded\n',
    );
    expect(() => showCommand('1', root)).toThrow(/failed to parse.*1-broken\.md/);
    expect(() => showCommand('1-broken.md', root)).toThrow(/failed to parse/);
  });

  it('renders relative paths with POSIX separators on every platform', () => {
    // `show`/`list`/`validate` print relativePath() output. On Windows a plain
    // join() yields `adr\.drafts\...`, which breaks the documented path form
    // (and the CLI tests that assert `adr/.drafts/`). The path must render
    // with forward slashes regardless of the host platform.
    const record: AdrRecord = {
      folder: 'drafts',
      path: join('adr', '.drafts', '2026-08-21-use-sqlite.md'),
      fileName: '2026-08-21-use-sqlite.md',
      title: 'Use SQLite',
      status: 'proposed',
      date: '2026-08-21',
      sections: [],
    };
    expect(relativePath(record)).toBe('adr/.drafts/2026-08-21-use-sqlite.md');
    expect(relativePath(record)).not.toContain('\\');
  });
});
