import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { proposeCommand } from '../src/commands/propose.js';
import { implementCommand } from '../src/commands/implement.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath, listProposals } from '../src/core/repository.js';
import { formatIssues, validateRecord } from '../src/core/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-validate-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
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

  it('fails an implemented record whose Consequences keeps only the template comment', () => {
    const root = makeRepo();
    const content = `---
status: implemented
date: 2026-08-19
raised-by: human
decided-by: human
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

<!-- what the trade-off cost and bought -->
`;
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Consequences" must contain written content');
  });

  it('fails a proposal whose Acceptance criteria and Risks keep only template comments', () => {
    const root = makeRepo();
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

<!-- what done means -->

## Risks

<!-- what could go wrong -->
`;
    writeFileSync(join(folderPath(root, 'proposed'), '2026-08-19-use-sqlite.md'), content);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Acceptance criteria" must contain written content');
    expect(result.output).toContain('section "## Risks" must contain written content');
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

  it('accepts the documented Later changes form', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      `## Consequences

Body.

### Later changes

**Amended by ADR 2:** the terminal command is now \`adrkit record\`; the
session shape above is unchanged.

**Amended by ADR 2 and ADR 3:** the reading posture was fixed; nothing else
changed.
`,
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    writeFileSync(
      join(folderPath(root, 'implemented'), '3-third.md'),
      decision('3 Third', { ...ACCEPTED, date: '2026-08-21', created: '2026-08-21' }),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('rejects the old trailing-prose amendment note', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      '## Consequences\n\nBody.\n\nADR 2 later changed the terminal command.\n',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('amendment note is trailing prose');
  });

  it('requires Later changes entries to keep the documented opening', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      '## Consequences\n\nBody.\n\n### Later changes\n\nAmended by ADR 2: changed.\n',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('must open "**Amended by ADR N:**"');
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('## Consequences\n\nBody.\n', '## Consequences\n\nBody.\n\n### Later changes\n'),
    );
    expect(validateCommand(root).output).toContain('must contain at least one entry');
  });

  it('accepts an entry continued in a second paragraph', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      `## Consequences

Body.

### Later changes

**Amended by ADR 2:** the terminal command is now \`adrkit record\`.

The session shape above is unchanged; the continuation paragraph belongs to
the same entry and is part of the note.
`,
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('flags an entry that lost its opening after a valid entry', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      `## Consequences

Body.

### Later changes

**Amended by ADR 2:** the terminal command is now \`adrkit record\`.

Amended by ADR 2: the second entry lost its opening.
`,
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('must open "**Amended by ADR N:**"');
  });

  it('ignores the old form inside fenced examples', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.\n',
      '## Consequences\n\nBody.\n\n```\nADR 2 later changed the terminal command.\n```\n',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-second.md'),
      decision('2 Second', { ...ACCEPTED, date: '2026-08-20', created: '2026-08-20' }),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('reports issue paths with forward slashes regardless of platform', () => {
    expect(
      formatIssues([{ path: 'adr\\implemented\\1-first.md', message: 'section "## Problem" must contain written content' }]),
    ).toContain('adr/implemented/1-first.md: section "## Problem" must contain written content');
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

describe('closed lifecycle inventory', () => {
  it('rejects a record in an unknown top-level folder', () => {
    const root = makeRepo();
    const dir = join(root, 'adr', 'accepted');
    mkdirSync(dir);
    writeFileSync(join(dir, '99-stray.md'), decision('99 Stray', ACCEPTED));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('adr/accepted');
    expect(result.output).toContain('unknown folder');
  });

  it('rejects an unknown folder even when it holds no record', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'adr', 'drafts'));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('adr/drafts');
  });

  it('rejects a record at the adr root', () => {
    const root = makeRepo();
    writeFileSync(join(root, 'adr', '99-stray.md'), decision('99 Stray', ACCEPTED));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('adr/99-stray.md');
    expect(result.output).toContain('outside a lifecycle folder');
  });

  it('rejects a nested folder inside a lifecycle folder', () => {
    const root = makeRepo();
    const dir = join(folderPath(root, 'implemented'), 'nested');
    mkdirSync(dir);
    writeFileSync(join(dir, '99-stray.md'), decision('99 Stray', ACCEPTED));

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('adr/implemented/nested');
    expect(result.output).toContain('nested folder');
  });

  it('allows root documents but not a record among them', () => {
    const root = makeRepo();
    writeFileSync(join(root, 'adr', 'notes.md'), '');
    writeFileSync(join(root, 'adr', 'README.zh.md'), '# 架构决策记录\n');
    expect(validateCommand(root).valid).toBe(true);

    writeFileSync(join(root, 'adr', '99-stray.md'), decision('99 Stray', ACCEPTED));
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('outside a lifecycle folder');
  });
});

describe('implemented Consequences subheadings', () => {
  it('rejects the old Acceptance criteria subsection under Consequences', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n### Acceptance criteria\n\nBody.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('proposal-era subsection "### Acceptance criteria"');
    expect(result.output).toContain('### Verification');
  });

  it('rejects the old Risks subsection under Consequences', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n### Verification\n\nBody.\n\n### Risks\n\nCost.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('proposal-era subsection "### Risks"');
    expect(result.output).toContain('### Trade-offs');
  });

  it('allows the old names under another section', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Decision\n\nBody.',
      '## Decision\n\n### Risks\n\nRisk discussion.\n\n### Acceptance criteria\n\nCriteria.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    expect(validateCommand(root).valid).toBe(true);
  });

  it('ignores fenced code and comments under Consequences', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n```md\n### Risks\n### Acceptance criteria\n```\n\n<!-- ### Risks -->\n\nBody.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    expect(validateCommand(root).valid).toBe(true);
  });

  it('matches exact H3 names only', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n### Risks and mitigations\n\nCost.\n\n#### Risks\n\nDeeper detail.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);

    expect(validateCommand(root).valid).toBe(true);
  });

  it('does not check proposals', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const proposal = listProposals(root)[0]!;
    writeFileSync(proposal.path, `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

P.

## Proposal

### Risks

A legitimate subsection.

## Alternatives considered

- **JSON**: no queries.

## Acceptance criteria

Works.

## Risks

Native dependency.
`);

    expect(validateCommand(root).valid).toBe(true);
  });

  it('does not check archived records', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '2-second.md'), decision('2 Second', ACCEPTED));
    const frozen = archivedDecision('1 Frozen', 2).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n### Risks\n\nOld risk.',
    );
    writeFileSync(join(folderPath(root, 'archived'), '1-frozen.md'), frozen);

    expect(validateCommand(root).valid).toBe(true);
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
    withProblemBody(root, 'Chose Postgres over SQLite.\n<!-- closed -->');
    expect(validateCommand(root).valid).toBe(true);
  });

  it('does not let visible text before an unclosed comment expose later sections', () => {
    const root = makeRepo();
    withProblemBody(root, 'Chose Postgres over SQLite.\n<!--');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('missing required section "## Decision"');
    expect(result.output).not.toContain('section "## Problem" must contain written content');
  });

  it('does not report a duplicate section for a heading inside a fence', () => {
    const root = makeRepo();
    const content = decision('1 First', ACCEPTED).replace(
      '## Consequences\n\nBody.',
      '## Consequences\n\n```md\n## Alternatives considered\n```\n\nBody.',
    );
    writeFileSync(join(folderPath(root, 'implemented'), '1-first.md'), content);
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
    const issues = validateRecord(root, listProposals(root)[0]!);
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
  it('does not mine a term that merely contains ADR, like MADR-12', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('Body.', 'We write records in MADR-12 format today.'),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('still mines a reference that follows punctuation', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-first.md'),
      decision('1 First', ACCEPTED).replace('Body.', 'See (ADR 99) for the follow-up.'),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('body references decision 99, which does not exist');
  });

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

    const issues = validateRecord(root, listProposals(root)[0]!);
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

    const issues = validateRecord(root, listProposals(root)[0]!);
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
    expect(validateRecord(root, listProposals(root)[0]!)).toEqual([]);
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
    expect(validateCommand(root).valid).toBe(true);
    expect(validateCommand(root, '1').valid).toBe(true);
    expect(validateCommand(root, '2').valid).toBe(true);
  });
});

describe('paths scope validation', () => {
  it('accepts scopes whose static prefix exists', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-scoped.md'),
      decision('1 Scoped', { ...ACCEPTED, paths: '[src/**, docs/*.md]' }),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('rejects a trailing slash that would match nothing', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-dir.md'),
      decision('1 Dir', { ...ACCEPTED, paths: '["src/"]' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('path "src/" must not end with "/"; use "src/**"');
  });

  it('accepts a scope with no checkable literal head', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-anywhere.md'),
      decision('1 Anywhere', { ...ACCEPTED, paths: '["**/*.test.ts"]' }),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('fails a scope stranded by a rename', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-gone.md'),
      decision('1 Gone', { ...ACCEPTED, paths: '[src/gone/**]' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('path "src/gone/**" matches nothing in the repository');
  });

  it('rejects absolute, climbing, backslashed, and duplicate entries', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-bad.md'),
      decision('1 Bad', { ...ACCEPTED, paths: '[/etc/**, ../up/**, src\\core, src/**, src/**]' }),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('path "/etc/**" must be repository-relative');
    expect(result.output).toContain('path "../up/**" must not climb out of the repository');
    expect(result.output).toContain('path "src\\core" must use forward slashes');
    expect(result.output).toContain('duplicate path "src/**"');
  });

  it('rejects an empty paths list', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-empty.md'),
      decision('1 Empty', { ...ACCEPTED, paths: '[]' }),
    );
    expect(validateCommand(root).valid).toBe(false);
    expect(validateCommand(root).output).toContain('paths must not be empty');
  });

  it('checks archived records for path drift like active records', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'implemented'), '2-current.md'),
      decision('2 Current', ACCEPTED),
    );
    const archived = archivedDecision('1 Archived', 2).replace(
      'archive-reason: superseded by ADR 2',
      'archive-reason: superseded by ADR 2\npaths: [gone/long-ago/**]',
    );
    writeFileSync(join(folderPath(root, 'archived'), '1-archived.md'), archived);
    expect(validateCommand(root).valid).toBe(false);
    expect(validateCommand(root).output).toContain('gone/long-ago/**');
  });
});
