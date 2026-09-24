import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { archiveCommand } from '../src/commands/archive.js';
import { implementCommand } from '../src/commands/implement.js';
import { proposeCommand } from '../src/commands/propose.js';
import { recordCommand } from '../src/commands/record.js';
import { rejectCommand } from '../src/commands/reject.js';
import { supersedeCommand } from '../src/commands/supersede.js';
import { todayStamp } from '../src/core/adr.js';
import { initRepository, listProposals, listRecords } from '../src/core/repository.js';
import { validateRepository } from '../src/core/validate.js';

const roots: string[] = [];

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'adrkit-lifecycle-'));
  roots.push(root);
  initRepository(root);
  return root;
}

function fillProposal(root: string, title: string): string {
  proposeCommand(title, root);
  const proposal = listProposals(root).find((record) => record.title === title);
  if (proposal === undefined) throw new Error('proposal missing');
  writeFileSync(proposal.path, `---
status: proposed
date: ${todayStamp()}
created: ${todayStamp()}
---

# ADR: ${title}

## Problem

Storage must survive restarts.

## Proposal

Use SQLite for local storage.

## Alternatives considered

JSON files would complicate queries.

## Acceptance criteria

Sessions survive restart.

## Risks

Native library packaging.
`);
  return proposal.path;
}

function fillDecision(root: string, number: number): void {
  const record = listRecords(root).find((candidate) => candidate.number === number);
  if (record === undefined) throw new Error('decision missing');
  const content = readFileSync(record.path, 'utf8')
    .replace('<!-- What problem or opportunity does this decision address? -->', 'Storage must survive restarts.')
    .replace('<!-- The decision that shipped, in present tense. -->', 'Use SQLite.')
    .replace(/<!-- Each genuine alternative and why it lost\. Keep this section: it is the\n     part of a decision record that prevents re-litigating old choices\. -->/, 'JSON files complicate queries.')
    .replace('<!-- What the trade-off cost and bought. -->', 'Local persistence requires packaging SQLite.');
  writeFileSync(record.path, content);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('four-folder lifecycle', () => {
  it('initializes all folders and keeps unshipped proposals unnumbered', () => {
    const root = repo();
    for (const folder of ['proposed', 'implemented', 'rejected', 'archived']) {
      expect(existsSync(join(root, 'adr', folder))).toBe(true);
    }
    expect(existsSync(join(root, 'adr', '.drafts'))).toBe(false);
    fillProposal(root, 'Use SQLite');
    expect(listProposals(root)[0]?.number).toBeUndefined();
    expect(validateRepository(root)).toEqual([]);
  });

  it('implements a shipped proposal and assigns its first stable number', () => {
    const root = repo();
    const path = fillProposal(root, 'Use SQLite');
    expect(implementCommand('Use SQLite', root, 'human', 'human')).toContain('adr/implemented/1-use-sqlite.md');
    expect(existsSync(path)).toBe(false);
    const decision = listRecords(root).find((record) => record.number === 1);
    expect(decision?.folder).toBe('implemented');
    expect(decision?.status).toBe('implemented');
    expect(validateRepository(root)).toEqual([]);
  });

  it('retains every formal rejection with a reason and no number', () => {
    const root = repo();
    const path = fillProposal(root, 'Use SQLite');
    expect(() => rejectCommand('Use SQLite', '', root)).toThrow('--reason');
    rejectCommand('Use SQLite', 'Queries are not needed', root);
    expect(existsSync(path)).toBe(false);
    const rejected = listRecords(root)[0];
    expect(rejected?.folder).toBe('rejected');
    expect(rejected?.rejectionReason).toBe('Queries are not needed');
    expect(rejected?.number).toBeUndefined();
    expect(validateRepository(root)).toEqual([]);
  });

  it('refuses to reject an incomplete proposal and reports its missing content', () => {
    const root = repo();
    proposeCommand('Use SQLite', root);
    expect(() => rejectCommand('Use SQLite', 'Not needed', root)).toThrow('section "## Problem" must contain written content');
    expect(listProposals(root)).toHaveLength(1);
    expect(listRecords(root).some((record) => record.folder === 'rejected')).toBe(false);
  });

  it('archives an implemented record without reusing its number', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Current behavior is owned by storage/config.ts', root);
    const old = listRecords(root).find((record) => record.number === 1);
    expect(old?.folder).toBe('archived');
    expect(old?.date).toBe(todayStamp());
    expect(old?.archived).toBe(todayStamp());
    expect(old?.archiveReason).toContain('storage/config.ts');
    recordCommand('Use Postgres', root, 'human', 'human');
    expect(listRecords(root).some((record) => record.number === 2)).toBe(true);
  });

  it('refuses archival of unshipped work or a blank reason', () => {
    const root = repo();
    fillProposal(root, 'Use SQLite');
    expect(() => archiveCommand('Use SQLite', 'No longer relevant', root)).toThrow('must be an implemented decision');
    recordCommand('Use Postgres', root, 'human', 'human');
    expect(() => archiveCommand('1', '', root)).toThrow('--reason');
    expect(listRecords(root).find((record) => record.number === 1)?.folder).toBe('implemented');
  });

  it('detects archive metadata that disagrees with the lifecycle date', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Current behavior is owned by storage/config.ts', root);
    const archived = listRecords(root).find((record) => record.number === 1)!;
    writeFileSync(archived.path, readFileSync(archived.path, 'utf8').replace('archived: ' + todayStamp(), 'archived: 2020-01-01'));
    expect(validateRepository(root).map((issue) => issue.message)).toContain('archived date must match the latest lifecycle date');
  });

  it('rejects a superseded status left in the active implemented folder', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    const record = listRecords(root).find((candidate) => candidate.number === 1)!;
    writeFileSync(record.path, readFileSync(record.path, 'utf8')
      .replace('status: implemented', 'status: superseded\nsuperseded-by: 2'));
    expect(validateRepository(root).map((issue) => issue.message)).toContain('status "superseded" is not valid in implemented/');
  });

  it('fully supersedes into frozen history while keeping a valid chain', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    recordCommand('Use Postgres', root, 'human', 'human');
    fillDecision(root, 2);
    supersedeCommand('1', '2', root);
    const old = listRecords(root).find((record) => record.number === 1);
    expect(old?.folder).toBe('archived');
    expect(old?.status).toBe('superseded');
    expect(old?.supersededBy).toBe(2);
    expect(validateRepository(root)).toEqual([]);
  });
});
