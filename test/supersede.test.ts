import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { acceptCommand } from '../src/commands/accept.js';
import { initCommand } from '../src/commands/init.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { statusCommand } from '../src/commands/status.js';
import { supersedeCommand } from '../src/commands/supersede.js';
import { validateCommand } from '../src/commands/validate.js';
import { todayStamp } from '../src/core/adr.js';
import { listDrafts } from '../src/core/repository.js';
import { formatIssues, validateDraft } from '../src/core/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-supersede-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

/** propose → fill → accept，返回 slug。`decidedBy` 默认 human，agent 分支显式传入。 */
function acceptDecision(
  root: string,
  title: string,
  decidedBy: 'human' | 'agent' = 'human',
): string {
  proposeCommand(title, root);
  const listing = JSON.parse(listCommand(root, true)) as Array<{ fileName: string; folder: string }>;
  const draft = listing.find((record) => record.folder === 'drafts');
  if (draft === undefined) throw new Error('draft not found');
  const slug = draft.fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  writeFileSync(join(root, 'adr', '.drafts', draft.fileName), `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: ${title}

## Problem

We need ${title}.

## Proposal

Use ${title}.

## Alternatives considered

- **Do nothing**: rejected because the problem persists.

## Acceptance criteria

It works.

## Risks

Some risk.
`);
  acceptCommand(title, root, decidedBy);
  return slug;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('supersedeCommand', () => {
  it('rewrites the front matter and keeps the record in decisions/', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');

    const message = supersedeCommand('1', '2', root);
    expect(message).toMatch(/superseded adr\/decisions\/1-.+ by adr\/decisions\/2-.+/);

    const old = readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8');
    const lines = old.split(/\r?\n/);
    expect(lines[1]).toBe('status: superseded');
    expect(lines[2]).toBe(`date: ${todayStamp()}`);
    // decided-by survives the retirement untouched: the field says who made
    // the decision, not who last rewrote the file.
    expect(lines[3]).toBe('decided-by: human');
    expect(lines[4]).toBe('created: 2026-08-19');
    expect(lines[5]).toBe('superseded-by: 2');

    const result = validateCommand(root, undefined, false);
    expect(result.valid).toBe(true);
  });

  it('counts superseded decisions separately in status', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');
    supersedeCommand('1', '2', root);

    const parsed = JSON.parse(statusCommand(root, true).output) as {
      counts: { accepted: number; superseded: number };
    };
    expect(parsed.counts).toMatchObject({ accepted: 1, superseded: 1 });
  });

  it('annotates superseded records in the text listing', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');
    supersedeCommand('1', '2', root);

    expect(listCommand(root, false)).toContain('[superseded by 2]');
  });

  it('refuses to supersede a proposal', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use Postgres');
    proposeCommand('Use SQLite', root);
    // Drafts are not decisions, so a draft title does not resolve for supersede.
    expect(() => supersedeCommand('use-sqlite', '1', root)).toThrow('no ADR matches');
  });

  it('refuses to supersede with a missing decision', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    expect(() => supersedeCommand('1', '9999', root)).toThrow('no ADR matches');
  });

  it('refuses self-supersede', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    expect(() => supersedeCommand('1', '1', root)).toThrow('cannot supersede itself');
  });

  it('refuses to supersede an already-superseded decision', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');
    supersedeCommand('1', '2', root);
    expect(() => supersedeCommand('1', '2', root)).toThrow('already superseded by 2');
  });

  it('refuses superseding with an already-superseded decision', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');
    acceptDecision(root, 'Use Spanner');
    supersedeCommand('2', '3', root);
    expect(() => supersedeCommand('1', '2', root)).toThrow('is itself superseded');
  });
});

describe('decided-by across the lifecycle', () => {
  const DRAFT = `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

## Problem

We need durability.

## Proposal

Use SQLite.

## Alternatives considered

- **JSON files**: rejected.

## Acceptance criteria

It works.

## Risks

Some risk.
`;

  it('records the declaration made at promotion, not the draft', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    expect(readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: human',
    );

    acceptDecision(root, 'Use Postgres', 'agent');
    expect(readFileSync(join(root, 'adr', 'decisions', '2-use-postgres.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
  });

  it('drops a decided-by smuggled into a draft, and rejects the draft while it exists', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const file = join(root, 'adr', '.drafts', listDrafts(root)[0]!.fileName);
    writeFileSync(file, DRAFT.replace('created:', 'decided-by: human\ncreated:'));

    const issues = validateDraft(root, listDrafts(root)[0]!);
    expect(formatIssues(issues)).toContain(
      '"decided-by" is declared at promotion and must not appear on a draft',
    );

    // Promote with an agent declaration: the decision must carry what the
    // caller declared, proving the draft's value found no path into the record.
    writeFileSync(file, DRAFT);
    acceptCommand('Use SQLite', root, 'agent');
    expect(readFileSync(join(root, 'adr', 'decisions', '1-use-sqlite.md'), 'utf8')).toContain(
      'decided-by: agent',
    );
  });

  it('preserves declared origins across supersede', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres', 'agent');
    supersedeCommand('1', '2', root);

    const frontMatter = (file: string): string => {
      const text = readFileSync(join(root, 'adr', 'decisions', file), 'utf8');
      return text.split('---')[1] ?? '';
    };
    // Superseding rewrites the retiring record's status, yet its declaration
    // survives untouched while the replacement keeps the one it was recorded
    // with; nobody re-declares on retirement.
    expect(frontMatter('1-use-sqlite.md')).toContain('decided-by: human');
    expect(frontMatter('2-use-postgres.md')).toContain('decided-by: agent');
    expect(validateCommand(root, undefined, false).valid).toBe(true);
  });
});

describe('validate superseded references', () => {
  it('flags a dangling superseded-by reference', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    const path = join(root, 'adr', 'decisions', '1-use-sqlite.md');
    const content = readFileSync(path, 'utf8');
    writeFileSync(path, content.replace('status: accepted', 'status: superseded\nsuperseded-by: 9999'));

    const result = validateCommand(root, undefined, false);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a missing decision');
  });

  it('flags a chain that points at another superseded decision', () => {
    const root = makeRepo();
    acceptDecision(root, 'Use SQLite');
    acceptDecision(root, 'Use Postgres');
    supersedeCommand('1', '2', root);

    // 手工制造 3 并让它指向已被取代的 1，验证 validate 拒绝悬空链
    writeFileSync(join(root, 'adr', 'decisions', '3-use-spanner.md'), `---
status: superseded
date: 2026-08-19
created: 2026-08-19
superseded-by: 1
---

# ADR: 3 Use Spanner

## Problem

We need durability.

## Decision

Use Spanner.

## Alternatives considered

- **Use SQLite**: rejected because it is embedded.

## Consequences

Operational overhead.
`);
    const result = validateCommand(root, undefined, false);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a superseded decision');
  });
});
