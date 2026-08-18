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

- **JSON**: rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    const output = instructionsCommand(root);
    expect(output).toContain('adrkit accept');
  });

  it('flags readiness per pending proposal and never suggests accepting a draft', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const sqlite = listRecords(root).find((record) => record.title === 'Use SQLite')!;
    writeFileSync(
      sqlite.path,
      '# ADR: Use SQLite\nStatus: proposed\n\n## Problem\n\nBody.\n',
    );
    proposeCommand('Add plugin API', root);
    const plugin = listRecords(root).find((record) => record.title === 'Add plugin API')!;
    writeFileSync(
      plugin.path,
      `# ADR: Add plugin API
Status: proposed

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **None**: rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    const output = instructionsCommand(root);
    expect(output).toContain('validated - ready to accept');
    expect(output).toContain('missing required section "## Proposal"');
    expect(output).toContain(`adrkit accept ${plugin.fileName}`);
    expect(output).not.toContain(`adrkit accept ${sqlite.fileName}`);
    expect(output).toContain(`adrkit validate ${sqlite.fileName}`);
  });

  it('reports readiness in JSON without changing the pending shape', () => {
    const root = makeRepo();
    proposeCommand('Use SQLite', root);
    const sqlite = listRecords(root).find((record) => record.title === 'Use SQLite')!;
    writeFileSync(
      sqlite.path,
      '# ADR: Use SQLite\nStatus: proposed\n\n## Problem\n\nBody.\n',
    );
    proposeCommand('Add plugin API', root);
    const plugin = listRecords(root).find((record) => record.title === 'Add plugin API')!;
    writeFileSync(
      plugin.path,
      `# ADR: Add plugin API
Status: proposed

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **None**: rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    const parsed = JSON.parse(instructionsCommand(root, true)) as {
      step: string;
      pending: string[];
      readyToAccept: string[];
      needsWork: Record<string, string[]>;
    };
    expect(parsed.step).toBe('decide');
    expect(parsed.pending).toEqual(expect.arrayContaining([plugin.fileName, sqlite.fileName]));
    expect(parsed.readyToAccept).toEqual([plugin.fileName]);
    expect(parsed.needsWork[sqlite.fileName]!.length).toBeGreaterThan(0);
    expect(parsed.needsWork[plugin.fileName]).toBeUndefined();
  });

  it('prioritizes pending proposals over unrelated validation issues', () => {
    const root = makeRepo();
    writeFileSync(
      join(folderPath(root, 'decisions'), '0001-broken.md'),
      '# ADR: 0001 Broken\nStatus: accepted\n\n## Problem\n\nBody.\n',
    );
    proposeCommand('Add plugin API', root);
    const plugin = listRecords(root).find((record) => record.title === 'Add plugin API')!;
    writeFileSync(
      plugin.path,
      `# ADR: Add plugin API
Status: proposed

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **None**: rejected.

## Acceptance criteria

Body.

## Risks

Body.
`,
    );
    const output = instructionsCommand(root);
    expect(output).toContain('adrkit accept');
    expect(output).not.toContain('Fix them before creating more records');
  });
});
