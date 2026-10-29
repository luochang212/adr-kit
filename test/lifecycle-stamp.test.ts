import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initRepository } from '../src/core/repository.js';
import { archiveCommand } from '../src/commands/archive.js';
import { supersedeCommand } from '../src/commands/supersede.js';
import { recordCommand } from '../src/commands/record.js';
import { proposeCommand } from '../src/commands/propose.js';

// The clock advances on every stamp, so two calls straddle midnight. This is
// the injected defect, not a simulated lifecycle: the commands run for real.
const clock = vi.hoisted(() => ({ day: 0 }));
vi.mock('../src/core/adr.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/core/adr.js')>();
  return {
    ...original,
    todayStamp: () => `2026-10-${String(1 + clock.day++).padStart(2, '0')}`,
  };
});

const roots: string[] = [];
function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'adrkit-stamp-'));
  roots.push(root);
  initRepository(root);
  return root;
}

const decision = (n: number): string => `---
status: implemented
date: 2026-01-01
description: Read when changing the storage choice exercised by this fixture.
raised-by: human
decided-by: human
created: 2026-01-01
---

# ADR: ${n} Choice

## Problem

Body.

## Decision

Body.

## Alternatives considered

- Other.

## Consequences

Body.
`;

function keepDecision(root: string, n: number): void {
  writeFileSync(join(root, `adr/implemented/${n}-choice.md`), decision(n));
}

function dateFields(text: string): { date: string; archived: string } {
  const date = text.match(/^date: (.+)$/m)?.[1];
  const archived = text.match(/^archived: (.+)$/m)?.[1];
  if (date === undefined || archived === undefined) throw new Error('archive fields missing');
  return { date, archived };
}

beforeEach(() => {
  clock.day = 0;
});
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('a lifecycle move takes one date', () => {
  it('writes the same date and archived day into an archived record', () => {
    const root = repo();
    keepDecision(root, 1);

    archiveCommand('1', 'no longer needed', root);

    const fields = dateFields(readFileSync(join(root, 'adr/archived/1-choice.md'), 'utf8'));
    expect(fields.archived).toBe(fields.date);
  });

  it('stamps date and created once when recording a decision', () => {
    const root = repo();

    recordCommand('Choice', root, 'agent', 'agent');

    const text = readFileSync(join(root, 'adr/implemented/1-choice.md'), 'utf8');
    expect(text.match(/^date: (.+)$/m)?.[1]).toBe(text.match(/^created: (.+)$/m)?.[1]);
  });

  it('stamps date and created once when proposing', () => {
    const root = repo();

    proposeCommand('Choice', root);

    const text = readFileSync(join(root, 'adr/proposed/2026-10-01-choice.md'), 'utf8');
    expect(text.match(/^date: (.+)$/m)?.[1]).toBe(text.match(/^created: (.+)$/m)?.[1]);
  });

  it('writes the same date and archived day when superseding', () => {
    const root = repo();
    keepDecision(root, 1);
    keepDecision(root, 2);

    supersedeCommand('1', '2', root);

    const fields = dateFields(readFileSync(join(root, 'adr/archived/1-choice.md'), 'utf8'));
    expect(fields.archived).toBe(fields.date);
  });
});
