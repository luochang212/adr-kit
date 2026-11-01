import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decisionNumberFromFileName, type AdrRecord } from '../src/core/adr.js';
import { archiveCommand } from '../src/commands/archive.js';
import { implementCommand } from '../src/commands/implement.js';
import { initCommand } from '../src/commands/init.js';
import { proposeCommand } from '../src/commands/propose.js';
import { rejectCommand } from '../src/commands/reject.js';
import { supersedeCommand } from '../src/commands/supersede.js';
import { validateCommand } from '../src/commands/validate.js';
import { proposalToDecision, stampLifecycleMove } from '../src/core/templates.js';
import {
  folderPath,
  listProposals,
  readRecord,
  resolveProposed,
  resolveRecordFromInventory,
  writeRecord,
} from '../src/core/repository.js';

const tempDirs: string[] = [];

/** Record files only; folders also carry a .gitkeep. */
function recordNames(root: string, folder: string): string[] {
  return readdirSync(folderPath(root, folder)).filter((name) => name.endsWith('.md'));
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-interrupted-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

/** A proposal whose sections carry written content, ready to promote. */
function fillProposal(root: string, title = 'Use SQLite'): void {
  proposeCommand(title, root);
  const draft = listProposals(root)[0]!;
  writeFileSync(join(folderPath(root, 'proposed'), draft.fileName), `---
status: proposed
date: 2026-08-19
description: Read when changing the storage choice exercised by this fixture.
created: 2026-08-19
---

# ADR: ${title}

## Problem

We need durable local storage.

## Proposal

Use SQLite.

## Alternatives considered

- **JSON files**: rejected because they do not scale for queries.

## Acceptance criteria

Sessions survive restart.

## Risks

Locking contention under load.
`);
}

/** A valid implemented decision written directly, as `record` would leave it. */
function implementedRecord(number: number, title: string): string {
  return `---
status: implemented
date: 2026-08-19
description: Read when changing the storage choice exercised by this fixture.
raised-by: human
decided-by: human
created: 2026-08-19
---

# ADR: ${number} ${title}

## Problem

We need durable local storage.

## Decision

Use SQLite.

## Alternatives considered

- **JSON files**: rejected because they do not scale for queries.

## Consequences

Queries stay local and fast.
`;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('convergence after an interrupted implement', () => {
  it('finishes the move instead of allocating a second number', () => {
    const root = makeRepo();
    fillProposal(root);
    const proposal = resolveProposed(root, 'use-sqlite');
    // The state a dead run leaves: the decision landed, the proposal stayed.
    const staged = proposalToDecision(proposal, 1, 'human', 'agent', proposal.date);
    writeRecord(root, 'implemented', '1-use-sqlite.md', staged);

    const output = implementCommand('use-sqlite', root, 'human', 'agent');

    expect(output).toContain('resumed an interrupted implement');
    expect(recordNames(root, 'implemented')).toEqual(['1-use-sqlite.md']);
    expect(listProposals(root)).toEqual([]);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('recognizes its own staging across a date change', () => {
    const root = makeRepo();
    fillProposal(root);
    const proposal = resolveProposed(root, 'use-sqlite');
    const staged = proposalToDecision(proposal, 1, 'human', 'agent', '2026-08-19');
    writeRecord(root, 'implemented', '1-use-sqlite.md', staged);

    const output = implementCommand('use-sqlite', root, 'human', 'agent');

    expect(output).toContain('resumed an interrupted implement');
    expect(recordNames(root, 'implemented')).toEqual(['1-use-sqlite.md']);
  });

  it('refuses bytes this move did not stage and leaves both files in place', () => {
    const root = makeRepo();
    fillProposal(root);
    const proposal = resolveProposed(root, 'use-sqlite');
    const staged = proposalToDecision(proposal, 1, 'human', 'agent', proposal.date);
    writeRecord(root, 'implemented', '1-use-sqlite.md', staged);
    const stagedPath = join(folderPath(root, 'implemented'), '1-use-sqlite.md');
    writeFileSync(stagedPath, staged.replace('Use SQLite.', 'Use SQLite, edited by hand.'));

    expect(() => implementCommand('use-sqlite', root, 'human', 'agent')).toThrow(
      /bytes are not this move's/,
    );
    expect(listProposals(root).length).toBe(1);
    expect(recordNames(root, 'implemented')).toEqual(['1-use-sqlite.md']);
  });
});

describe('convergence after an interrupted reject', () => {
  it('finishes the move when the staged rejection is its own', () => {
    const root = makeRepo();
    fillProposal(root);
    const proposal = resolveProposed(root, 'use-sqlite');
    const source = readRecord(proposal);
    const staged = stampLifecycleMove(source, {
      status: 'rejected',
      date: '2026-08-19',
      reason: 'too costly',
    });
    writeRecord(root, 'rejected', proposal.fileName, staged);

    const output = rejectCommand('use-sqlite', 'too costly', root);

    expect(output).toContain('resumed an interrupted reject');
    expect(listProposals(root)).toEqual([]);
    expect(recordNames(root, 'rejected')).toEqual([proposal.fileName]);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('refuses a staged rejection written with a different reason', () => {
    const root = makeRepo();
    fillProposal(root);
    const proposal = resolveProposed(root, 'use-sqlite');
    const staged = stampLifecycleMove(readRecord(proposal), {
      status: 'rejected',
      date: '2026-08-19',
      reason: 'too costly',
    });
    writeRecord(root, 'rejected', proposal.fileName, staged);

    expect(() => rejectCommand('use-sqlite', 'a different reason', root)).toThrow(
      /rejected record already exists/,
    );
    expect(listProposals(root).length).toBe(1);
  });
});

describe('convergence after an interrupted retirement', () => {
  it('finishes an archive whose staged copy is its own, across dates', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), implementedRecord(1, 'Use SQLite'));
    const source = readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8');
    const staged = stampLifecycleMove(source, {
      date: '2026-09-09',
      archived: '2026-09-09',
      'archive-reason': 'no longer needed',
    });
    writeRecord(root, 'archived', '1-use-sqlite.md', staged);

    archiveCommand('1', 'no longer needed', root);

    expect(recordNames(root, 'implemented')).toEqual([]);
    expect(recordNames(root, 'archived')).toEqual(['1-use-sqlite.md']);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('refuses an archive whose staged copy carries a different reason', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), implementedRecord(1, 'Use SQLite'));
    const source = readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8');
    const staged = stampLifecycleMove(source, {
      date: '2026-09-09',
      archived: '2026-09-09',
      'archive-reason': 'a different reason',
    });
    writeRecord(root, 'archived', '1-use-sqlite.md', staged);

    expect(() => archiveCommand('1', 'no longer needed', root)).toThrow(
      /archived record already exists/,
    );
    expect(recordNames(root, 'implemented')).toEqual(['1-use-sqlite.md']);
    expect(recordNames(root, 'archived')).toEqual(['1-use-sqlite.md']);
  });

  it('finishes a supersede whose staged copy is its own', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), implementedRecord(1, 'Use SQLite'));
    writeFileSync(join(folderPath(root, 'implemented'), '2-use-postgres.md'), implementedRecord(2, 'Use Postgres'));
    const source = readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8');
    const staged = stampLifecycleMove(source, {
      status: 'superseded',
      date: '2026-09-09',
      'superseded-by': 2,
      archived: '2026-09-09',
      'archive-reason': 'superseded by ADR 2',
    });
    writeRecord(root, 'archived', '1-use-sqlite.md', staged);

    supersedeCommand('1', '2', root);

    expect(recordNames(root, 'implemented')).toEqual(['2-use-postgres.md']);
    expect(recordNames(root, 'archived')).toEqual(['1-use-sqlite.md']);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('refuses a supersede whose staged copy names a different successor', () => {
    const root = makeRepo();
    writeFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), implementedRecord(1, 'Use SQLite'));
    writeFileSync(join(folderPath(root, 'implemented'), '2-use-postgres.md'), implementedRecord(2, 'Use Postgres'));
    writeFileSync(join(folderPath(root, 'implemented'), '3-use-maria.md'), implementedRecord(3, 'Use MariaDB'));
    const source = readFileSync(join(folderPath(root, 'implemented'), '1-use-sqlite.md'), 'utf8');
    const staged = stampLifecycleMove(source, {
      status: 'superseded',
      date: '2026-09-09',
      'superseded-by': 3,
      archived: '2026-09-09',
      'archive-reason': 'superseded by ADR 3',
    });
    writeRecord(root, 'archived', '1-use-sqlite.md', staged);

    expect(() => supersedeCommand('1', '2', root)).toThrow(/archived record already exists/);
    expect(recordNames(root, 'implemented').length).toBe(3);
  });
});

describe('decision number vocabulary', () => {
  it('reads the number a file name carries, single-sourced', () => {
    expect(decisionNumberFromFileName('7-use-sqlite.md')).toBe(7);
    expect(decisionNumberFromFileName('12-x.md')).toBe(12);
    expect(decisionNumberFromFileName('07-x.md')).toBeUndefined();
    expect(decisionNumberFromFileName('x.md')).toBeUndefined();
  });

  it('does not resolve query "0" to a record without a number', () => {
    const numberless = {
      folder: 'implemented',
      path: '/nowhere/broken.md',
      fileName: 'broken.md',
      title: 'Broken',
      status: 'implemented',
      date: '2026-08-19',
      sections: [],
    } as AdrRecord;
    expect(() => resolveRecordFromInventory('/nowhere', '0', [numberless])).toThrow(
      /no ADR matches "0"/,
    );
  });
});
