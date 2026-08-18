import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { validateCommand } from '../src/commands/validate.js';
import { folderPath } from '../src/core/repository.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-validate-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

function decision(title: string, status: string): string {
  return `# ADR: ${title}
Status: ${status}
Date: 2026-08-19

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
    const content = `# ADR: 1 First
Status: accepted
Date: 2026-08-19

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
    const content = `# ADR: 1 First
Status: accepted
Date: 2026-08-19

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
      decision('1 First', 'superseded by 99'),
    );
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a missing decision');
  });

  it('flags a supersede reference to a superseded decision when validating a single record', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', 'superseded by 2'),
    );
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-second.md'),
      decision('2 Second', 'superseded by 3'),
    );
    writeFileSync(join(folderPath(root, 'decisions'), '3-third.md'), decision('3 Third', 'accepted'));
    const result = validateCommand(root, '1');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('references a superseded decision');
  });

  it('passes a single record whose supersede reference is valid', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', 'superseded by 2'),
    );
    writeFileSync(
      join(folderPath(root, 'decisions'), '2-second.md'),
      decision('2 Second', 'accepted'),
    );
    expect(validateCommand(root, '1').valid).toBe(true);
  });

  it('flags a zero-padded decision title', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('0001 First', 'accepted'),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('accepted decision title must be');
  });

  it('flags an invalid calendar date on the Date line', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-first.md'),
      decision('1 First', 'accepted').replace('Date: 2026-08-19', 'Date: 2026-02-31'),
    );
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('invalid calendar date');
  });
});
