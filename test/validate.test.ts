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
});
