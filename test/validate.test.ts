import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { proposeCommand } from '../src/commands/propose.js';
import { implementCommand } from '../src/commands/implement.js';
import { validateCommand } from '../src/commands/validate.js';
import { sealBytes, writeArchiveManifest } from '../src/core/archive-seal.js';
import { folderPath, listProposals } from '../src/core/repository.js';
import { formatIssues, validateProposal } from '../src/core/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-validate-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

/**
 * Seal every archived record currently on disk. Fixtures hand-write archived
 * files, but the contract requires each one to carry a manifest seal, so a
 * test asserting valid output seals its archive first.
 */
function sealArchive(root: string): void {
  const dir = folderPath(root, 'archived');
  const entries = existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith('.md'))
        .sort()
        .map((file) => ({ path: file, sha256: sealBytes(readFileSync(join(dir, file))) }))
    : [];
  writeArchiveManifest(root, { version: 1, entries });
}

function decision(title: string, fields: Record<string, string | number>): string {
  // `raised-by`, `decided-by`, and `created` are required; default them so
  // fixtures stay terse. A fixture that needs a field missing drops it from the
  // rendered front matter instead.
  const entries: Array<[string, string | number]> = [];
  for (const [key, value] of Object.entries(fields)) {
    entries.push([key, value]);
    if (key === 'date') {
      if (!('raised-by' in fields)) entries.push(['raised-by', 'human']);
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

const ACCEPTED = { status: 'implemented', date: '2026-08-19' };

function archivedDecision(title: string, successor: number): string {
  return decision(title, {
    status: 'superseded',
    date: '2026-08-19',
    'superseded-by': successor,
    archived: '2026-08-19',
    'archive-reason': `superseded by ADR ${successor}`,
  });
}

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

  it('fails a decision whose Alternatives considered has no written alternative', () => {
    const root = makeRepo();
    const content = `---
status: implemented
date: 2026-08-19
raised-by: human
decided-by: human
created: 2026-08-19
---

# ADR: 1 Use SQLite

## Problem

Body.

## Decision

Body.

## Alternatives considered

<!-- none written yet -->

## Consequences

Body.
`;
    writeFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('must contain at least one written alternative');
  });

  it('detects duplicate decision numbers', () => {
    const root = makeRepo();
    const content = `---
status: implemented
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
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(join(folderPath(root, 'implemented'), '1-second.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('duplicate decision number');
  });

  it('rejects proposal-era headings in implemented records', () => {
    const root = makeRepo();
    const content = `---
status: implemented
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
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('proposal-era section');
  });

  it('flags unknown front matter fields', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
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
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 99 }),
    );
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a missing decision');
  });

  it('accepts a supersession chain when validating a single record', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'archived'), '1-first.md'),
      archivedDecision('1 First', 2),
    );
    writeFileSync(
      join(folderPath(root, 'archived'), '2-second.md'),
      archivedDecision('2 Second', 3),
    );
    writeFileSync(join(folderPath(root, 'implemented'), '3-third.md'), decision('3 Third', ACCEPTED));
    sealArchive(root);
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(true);
  });

  it('passes a single record whose supersede reference is valid', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'archived'), '1-first.md'),
      archivedDecision('1 First', 2),
    );
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', ACCEPTED),
    );
    sealArchive(root);
    expect(validateCommand(root, '1').valid).toBe(true);
  });

  it('flags a zero-padded decision title', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('0001 First', ACCEPTED),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('implemented title must be');
  });

  it('flags an invalid calendar date in the front matter', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', { status: 'implemented', date: '2026-02-31' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('invalid calendar date');
  });

  it('requires the created field', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      `---
status: implemented
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
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', { status: 'implemented', date: '2026-08-19', created: '2026-08-20' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('created must not be after the status date');
  });

  it('flags an invalid calendar date in created', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', { status: 'implemented', date: '2026-08-19', created: '2026-02-30' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('created contains an invalid calendar date');
  });

  it('flags malformed, duplicate, and empty tags', () => {    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      `---
status: implemented
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
      join(folderPath(root, 'implemented'), '2-second.md'),
      `---
status: implemented
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

describe('written content and comment handling', () => {
  /** Replace the fixture's `## Problem` body, keeping the rest of the record valid. */
  function withProblemBody(root: string, body: string): void {
    const content = decision('1 First', ACCEPTED).replace(
      '## Problem\n\nBody.',
      `## Problem\n\n${body}`,
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
  }

  it('does not count an unterminated comment as written content', () => {
    const root = makeRepo();
    withProblemBody(root, '<!--');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Problem" must contain written content');
  });

  it('swallows the prose that follows an unterminated comment', () => {
    const root = makeRepo();
    withProblemBody(root, '<!--\nThis prose sits inside the comment.');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Problem" must contain written content');
  });

  it('counts text outside a comment as written content', () => {
    const root = makeRepo();
    withProblemBody(root, 'Chose Postgres over SQLite.\n<!--');
    expect(validateCommand(root).valid).toBe(true);
  });

  it('keeps stripping a closed comment', () => {
    const root = makeRepo();
    withProblemBody(root, '<!-- none written yet -->');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Problem" must contain written content');
  });

  it('refuses a draft whose only alternative is an unterminated comment', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', 'proposed', listProposals(root)[0]!.fileName);
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

<!--

## Acceptance criteria

It works.

## Risks

Some risk.
`,
    );
    const issues = validateProposal(root, listProposals(root)[0]!);
    expect(formatIssues(issues)).toContain('must contain at least one written alternative');
  });

  it('refuses to promote a draft whose sections hold only comment markers', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', 'proposed', listProposals(root)[0]!.fileName);
    // The audited defect: every required section held one unterminated marker
    // and `accept` promoted the result into an immutable, empty record.
    writeFileSync(
      file,
      `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

<!--

## Proposal

<!--

## Alternatives considered

<!--

## Acceptance criteria

<!--

## Risks

<!--
`,
    );
    expect(() => implementCommand('Use SQLite', root, 'human', 'human')).toThrow(
      /must contain written content/,
    );
  });

  it('validates a crafted comment payload promptly', () => {    const root = makeRepo();
    // 500 KB of unterminated markers: the strip stays linear, so this is
    // milliseconds rather than the tens of seconds a rescanning expression
    // takes on the same input.
    withProblemBody(root, '<!--'.repeat(125_000));
    const started = Date.now();
    const result = validateCommand(root);
    const elapsed = Date.now() - started;
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Problem" must contain written content');
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('body references', () => {
  it('flags a body reference to a decision that does not exist', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('Body.', 'See ADR-99 for the follow-up.'),
    );

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('body references decision 99, which does not exist');
  });

  it('accepts a body reference that resolves', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('Body.', 'See ADR 2 for the follow-up.'),
    );
    writeFileSync(join(folderPath(root, 'implemented'), '2-second.md'), decision('2 Second', ACCEPTED));

    expect(validateCommand(root).valid).toBe(true);
  });

  it('resolves references against the whole repository in single-record validation', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('Body.', 'See ADR-2 for the follow-up.'),
    );
    writeFileSync(join(folderPath(root, 'implemented'), '2-second.md'), decision('2 Second', ACCEPTED));

    expect(validateCommand(root, '1').valid).toBe(true);
  });
});

describe('decided-by', () => {
  /** The `decision()` helper always writes the field; drop it for these fixtures. */
  function withoutDecidedBy(title: string, fields: Record<string, string | number>): string {
    return decision(title, fields).replace('decided-by: human\n', '');
  }

  it('flags a record missing raised-by', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace('raised-by: human\n', '');
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('front matter must include "raised-by"');
  });

  it('flags a record missing decided-by and leaves the file untouched', () => {
    const root = makeRepo();
    const content = withoutDecidedBy('1 First', ACCEPTED);
    const path = join(folderPath(root, 'implemented'), '1-first.md');
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
      join(folderPath(root, 'implemented'), '1-first.md'),
      withoutDecidedBy('1 First', { status: 'superseded', date: '2026-08-19', 'superseded-by': 2 }),
    );
    writeFileSync(join(folderPath(root, 'implemented'), '2-second.md'), decision('2 Second', ACCEPTED));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('front matter must include "decided-by"');
  });

  it('passes records carrying either implemented value', () => {
    for (const value of ['human', 'agent'] as const) {
      const root = makeRepo();
      writeFileSync(
        join(folderPath(root, 'implemented'), '1-first.md'),
        decision('1 First', { ...ACCEPTED, 'decided-by': value }),
      );
      expect(validateCommand(root).valid).toBe(true);
    }
  });

  it('flags decided-by on a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', 'proposed', listProposals(root)[0]!.fileName);
    const content = readFileSync(file, 'utf8').replace('created:', 'decided-by: human\ncreated:');
    writeFileSync(file, content);

    const issues = validateProposal(root, listProposals(root)[0]!);
    expect(formatIssues(issues)).toContain(
      'unshipped records must not include "decided-by"',
    );
  });

  it('flags raised-by on a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', 'proposed', listProposals(root)[0]!.fileName);
    const content = readFileSync(file, 'utf8').replace('created:', 'raised-by: human\ncreated:');
    writeFileSync(file, content);

    const issues = validateProposal(root, listProposals(root)[0]!);
    expect(formatIssues(issues)).toContain(
      'unshipped records must not include "raised-by"',
    );
  });

  it('accepts a draft without the field', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', 'proposed', listProposals(root)[0]!.fileName);
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
    expect(validateProposal(root, listProposals(root)[0]!)).toEqual([]);
  });
});


describe('supersession chain integrity', () => {
  it.each([
    { name: 'missing downstream target', targets: [2, 99], error: 'references a missing decision' },
    { name: 'self-link', targets: [1], error: 'cycle' },
    { name: 'two-record cycle', targets: [2, 1], error: 'cycle' },
    { name: 'cycle beyond the starting record', targets: [2, 3, 2], error: 'cycle' },
    { name: 'superseded terminal without a successor', targets: [2, undefined], error: 'superseded status requires a positive integer' },
  ])('rejects $name in both validation modes', ({ targets, error }) => {
    const root = makeRepo();
    targets.forEach((target, index) => {
      const fields: Record<string, string | number> = { ...ACCEPTED, status: 'superseded' };
      if (target !== undefined) fields['superseded-by'] = target;
      writeFileSync(join(folderPath(root, 'implemented'), `${index + 1}-record.md`),
        decision(`${index + 1} Record`, fields));
    });
    for (const query of [undefined, '1']) {
      const result = validateCommand(root, query);
      expect(result.valid).toBe(false);
      expect(result.output).toContain(error);
    }
  });

  it('rejects a chain ending in a non-decision status', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', { ...ACCEPTED, status: 'superseded', 'superseded-by': 2 }));
    writeFileSync(join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, status: 'proposed' }));
    for (const query of [undefined, '1']) {
      const result = validateCommand(root, query);
      expect(result.valid).toBe(false);
      expect(result.output).toContain('must end at an implemented decision');
    }
  });

  it('allows longer chains and converging histories without flattening links', () => {
    const root = makeRepo();
    for (let n = 1; n <= 12; n++) {
      const fields: Record<string, string | number> = { ...ACCEPTED };
      if (n < 12) {
        fields.status = 'superseded';
        fields['superseded-by'] = n < 3 ? 3 : n + 1;
      }
      if (n < 12) {
        writeFileSync(join(folderPath(root, 'archived'), `${n}-record.md`),
          archivedDecision(`${n} Record`, Number(fields['superseded-by'])));
      } else {
        writeFileSync(join(folderPath(root, 'implemented'), `${n}-record.md`),
          decision(`${n} Record`, fields));
      }
    }
    sealArchive(root);
    expect(validateCommand(root).valid).toBe(true);
    expect(validateCommand(root, '1').valid).toBe(true);
    expect(validateCommand(root, '2').valid).toBe(true);
  });
});
