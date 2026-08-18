import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { acceptCommand } from '../src/commands/accept.js';
import { initCommand } from '../src/commands/init.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { showCommand } from '../src/commands/show.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath, listRecords } from '../src/core/repository.js';

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
      `# ADR: 1 Use SQLite
Status: accepted

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
      `# ADR: 1 使用 SQLite
Status: accepted

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

  it('rejects invalid calendar dates in proposed file names', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'proposed'), '2026-02-31-use-sqlite.md'),
      `# ADR: Use SQLite
Status: proposed

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
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('invalid calendar date');
  });

  it('rejects a record whose status does not match its folder', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `# ADR: 1 Use SQLite
Status: proposed

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
    expect(result.output).toContain('does not match folder');
  });

  it('resolves records by slug', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `# ADR: 1 Use SQLite
Status: accepted

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
    const proposal = listRecords(root).find((record) => record.folder === 'proposed')!;
    writeFileSync(
      proposal.path,
      `# ADR: Use SQLite
Status: proposed

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
});
