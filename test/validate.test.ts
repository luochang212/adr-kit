import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { proposeCommand } from '../src/commands/propose.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath, listDrafts } from '../src/core/repository.js';
import { formatIssues, validateDraft } from '../src/core/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-validate-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function decision(title: string, fields: Record<string, string | number>): string {
  // `decided-by` and `created` are required; default them so fixtures stay
  // terse. A fixture that needs the field missing passes `decided-by: ''`,
  // which renders an invalid value the parser rejects — tests that omit the
  // field build their front matter by hand instead.
  const entries: Array<[string, string | number]> = [];
  for (const [key, value] of Object.entries(fields)) {
    entries.push([key, value]);
    if (key === 'date') {
      if (!('decided-by' in fields)) entries.push(['decided-by', 'human']);
      if (!('created' in fields)) entries.push(['created', value]);
    }
  }
  const frontMatter = entries.map(([key, value]) => `${key}: ${value}`).join('\n');
  return `---
${frontMatter}
---

# ADR: ${title}

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **Other**: rejected.

## Consequences

Body.
`;
}

const ACCEPTED = { status: 'accepted', date: '2026-08-19' };

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('validateCommand', () => {
  it('validates a fresh empty repository', () => {
    const root = makeRepo();
    expect(validateCommand(root).valid).toBe(true);
  });

  it('detects duplicate decision numbers', () => {
    const root = makeRepo();
    const content = `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 First

## Problem

Body.

## Decision

Body.

## Alternatives considered

- **Other**: rejected.

## Consequences

Body.
`;
    writeFileSync(join(folderPath(root, 'decisions'), '1-first.md'), content);
    writeFileSync(join(folderPath(root, 'decisions'), '1-second.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('duplicate decision number');
  });

  it('rejects proposal-era headings in accepted decisions', () => {
    const root = makeRepo();
    const content = `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 1 First

## Problem

Body.

## Proposal

Body.

## Alternatives considered

Body.

## Consequences

Body.
`;
    writeFileSync(join(folderPath(root, 'decisions'), '1-first.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('proposal-era section');
  });

  it('flags unknown front matter fields', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { ...ACCEPTED, owner: 'platform' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('unknown front matter field "owner"');
  });

  it('reports invalid config.yaml', () => {
    const root = makeRepo();
    writeFileSync(join(root, 'adr', 'config.yaml'), 'context: [unclosed\n');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('config.yaml');
  });

  it('flags a dangling supersede reference when validating a single record', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 99 }),
    );
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a missing decision');
  });

  it('flags a supersede reference to a superseded decision when validating a single record', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 2 }),
    );
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-second.md'),
      decision('2 Second', { status: 'superseded', date: '2026-08-19', 'superseded-by': 3 }),
    );
    writeFileSync(join(folderPath(root, 'decisions'), '3-third.md'), decision('3 Third', ACCEPTED));
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a superseded decision');
  });

  it('passes a single record whose supersede reference is valid', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 2 }),
    );
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-second.md'),
      decision('2 Second', ACCEPTED),
    );
    expect(validateCommand(root, '1').valid).toBe(true);
  });

  it('flags a zero-padded decision title', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('0001 First', ACCEPTED),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('accepted decision title must be');
  });

  it('flags an invalid calendar date in the front matter', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'accepted', date: '2026-02-31' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('invalid calendar date');
  });

  it('requires the created field', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      `---
status: accepted
date: 2026-08-19
---

# ADR: 1 First

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
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('front matter must include "created"');
  });

  it('flags created after the status date', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'accepted', date: '2026-08-19', created: '2026-08-20' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('created must not be after the status date');
  });

  it('flags an invalid calendar date in created', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', { status: 'accepted', date: '2026-08-19', created: '2026-02-30' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('created contains an invalid calendar date');
  });

  it('flags malformed, duplicate, and empty tags', () => {    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      `---
status: accepted
date: 2026-08-19
created: 2026-08-19
tags: [Execution Layer, sandbox, sandbox]
---

# ADR: 1 First

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
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-second.md'),
      `---
status: accepted
date: 2026-08-19
created: 2026-08-19
tags: []
---

# ADR: 2 Second

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
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('tag "Execution Layer" must be lowercase kebab-case');
    expect(result.output).toContain('duplicate tag "sandbox"');
    expect(result.output).toContain('tags must not be empty');
  });
});

describe('decided-by', () => {
  /** The `decision()` helper always writes the field; drop it for these fixtures. */
  function withoutDecidedBy(title: string, fields: Record<string, string | number>): string {
    return decision(title, fields).replace('decided-by: human\n', '');
  }

  it('flags a record missing decided-by and leaves the file untouched', () => {
    const root = makeRepo();
    const content = withoutDecidedBy('1 First', ACCEPTED);
    const path = join(folderPath(root, 'decisions'), '1-first.md');
    writeFileSync(path, content);

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('front matter must include "decided-by"');
    // Nothing repairs history: validation is read-only, so an agent never
    // invents who made a decision the record does not name.
    expect(readFileSync(path, 'utf8')).toBe(content);
  });

  it('flags a superseded record missing decided-by', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      withoutDecidedBy('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 2 }),
    );
    writeFileSync(join(folderPath(root, 'decisions'), '2-second.md'), decision('2 Second', ACCEPTED));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('front matter must include "decided-by"');
  });

  it('passes records carrying either accepted value', () => {
    for (const value of ['human', 'agent'] as const) {
      const root = makeRepo();
      writeFileSync(
        join(folderPath(root, 'decisions'), '1-first.md'),
        decision('1 First', { ...ACCEPTED, 'decided-by': value }),
      );
      expect(validateCommand(root).valid).toBe(true);
    }
  });

  it('flags decided-by on a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', '.drafts', listDrafts(root)[0]!.fileName);
    const content = readFileSync(file, 'utf8').replace('created:', 'decided-by: human\ncreated:');
    writeFileSync(file, content);

    const issues = validateDraft(root, listDrafts(root)[0]!);
    expect(formatIssues(issues)).toContain(
      '"decided-by" is declared at promotion and must not appear on a draft',
    );
  });

  it('accepts a draft without the field', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', '.drafts', listDrafts(root)[0]!.fileName);
    writeFileSync(
      file,
      `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

We need durable storage.

## Proposal

Use SQLite.

## Alternatives considered

- **JSON files**: rejected.

## Acceptance criteria

It works.

## Risks

Some risk.
`,
    );
    expect(validateDraft(root, listDrafts(root)[0]!)).toEqual([]);
  });
});
