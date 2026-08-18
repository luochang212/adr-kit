import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { proposeCommand } from '../src/commands/propose.js';
import { statusCommand } from '../src/commands/status.js';
import { folderPath, listRecords } from '../src/core/repository.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-workflow-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('statusCommand', () => {
  it('reports counts and validity for a fresh repo', () => {
    const root = makeRepo();
    const result = statusCommand(root);
    expect(result.valid).toBe(true);
    expect(result.output).toContain('accepted: 0');
    expect(result.output).toContain('proposed: 0');
  });

  it('reports json with issues when a decision is invalid', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '0001-broken.md'),
      '# ADR: 0001 Broken\nStatus: accepted\n\n## Problem\n\nBody.\n',
    );
    const result = statusCommand(root, true);
    expect(result.valid).toBe(false);
    const parsed = JSON.parse(result.output) as { counts: { decisions: number } };
    expect(parsed.counts).toBeDefined();
  });
});

describe('instructionsCommand', () => {
  it('tells an empty repo to propose next', () => {
    const root = makeRepo();
    const output = instructionsCommand(root);
    expect(output).toContain('adrkit propose');
  });

  it('tells a repo with a pending proposal to decide next', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const record = listRecords(root)[0];
    writeFileSync(
      record!.path,
      `# ADR: Use SQLite
Status: proposed

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **JSON** — rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    const output = instructionsCommand(root);
    expect(output).toContain('adrkit accept');
  });
});
