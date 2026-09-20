import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { treeCommand } from '../src/commands/tree.js';
import {
  parseDeliberation,
  renderDeliberationMermaid,
  renderDeliberationText,
} from '../src/core/deliberation.js';
import { folderPath } from '../src/core/repository.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-deliberation-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const BODY = `Some prose before the tree.

- Root question? [settled]
  - Option A [rejected]
  - Option B
    - Sub decision [open]
- Second root

Trailing prose.`;

describe('parseDeliberation', () => {
  it('reads nesting and trailing status markers', () => {
    const nodes = parseDeliberation(BODY);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.text).toBe('Root question?');
    expect(nodes[0]!.status).toBe('settled');
    expect(nodes[0]!.children.map((child) => child.text)).toEqual(['Option A', 'Option B']);
    expect(nodes[0]!.children[0]!.status).toBe('rejected');
    expect(nodes[0]!.children[1]!.children[0]!.text).toBe('Sub decision');
    expect(nodes[0]!.children[1]!.children[0]!.status).toBe('open');
    expect(nodes[1]!.children).toEqual([]);
  });

  it('is empty for an absent or non-list body', () => {
    expect(parseDeliberation(undefined)).toEqual([]);
    expect(parseDeliberation('just prose')).toEqual([]);
  });

  it('renders text and mermaid views of the same tree', () => {
    const nodes = parseDeliberation(BODY);
    expect(renderDeliberationText(nodes)).toBe(
      [
        '- Root question? [settled]',
        '  - Option A [rejected]',
        '  - Option B',
        '    - Sub decision [open]',
        '- Second root',
      ].join('\n'),
    );
    const mermaid = renderDeliberationMermaid(nodes);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('n1 --> n2');
    expect(mermaid).toContain('n1 --> n3');
    expect(mermaid).toContain('n3 --> n4');
    expect(mermaid).toContain('class n1 settled;');
    expect(mermaid).toContain('class n2 rejected;');
    expect(mermaid).toContain('class n4 open;');
  });
});

describe('treeCommand', () => {
  function writeRecord(root: string, deliberation: string): void {
    writeFileSync(
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      `---
status: accepted
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

- **JSON**: rejected.

## Consequences

Body.

## Deliberation

${deliberation}
`,
    );
  }

  it('renders text and mermaid for a record with a tree', () => {
    const root = makeRepo();
    writeRecord(root, BODY);
    expect(treeCommand('1', root, 'text')).toContain('- Root question? [settled]');
    expect(treeCommand('1', root, 'mermaid')).toContain('n1 --> n2');
  });

  it('fails clearly when the record has no tree', () => {
    const root = makeRepo();
    writeRecord(root, 'no bullet list here');
    expect(() => treeCommand('1', root, 'text')).toThrow('has no "## Deliberation" tree');
  });
});
