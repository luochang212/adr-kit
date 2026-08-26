import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { graphCommand } from '../src/commands/graph.js';
import { initCommand } from '../src/commands/init.js';
import { buildDecisionGraph } from '../src/core/graph.js';
import { listRecords } from '../src/core/repository.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-graph-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

interface DecisionOptions {
  status?: string;
  date: string;
  /** Defaults to `date`; graph grouping uses this. */
  created?: string;
  supersededBy?: number;
  tags?: string[];
  /** Extra prose dropped into ## Decision; where ADR-N references live. */
  decisionBody?: string;
}

function writeDecision(root: string, number: number, title: string, options: DecisionOptions): void {
  const superseded = options.supersededBy === undefined ? '' : `\nsuperseded-by: ${options.supersededBy}`;
  const tags = options.tags === undefined ? '' : `\ntags: [${options.tags.join(', ')}]`;
  const content = `---
status: ${options.status ?? 'accepted'}
date: ${options.date}
created: ${options.created ?? options.date}${superseded}${tags}
---

# ADR: ${number} ${title}

## Problem

p

## Decision

${options.decisionBody ?? 'd'}

## Alternatives considered

a

## Consequences

c
`;
  const dir = join(root, 'adr', 'decisions');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${number}-${title.toLowerCase().replaceAll(' ', '-')}.md`), content);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildDecisionGraph', () => {
  it('mines ADR-N references from record bodies', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-17' });
    writeDecision(root, 2, 'Second', { date: '2026-08-17', decisionBody: 'Builds on ADR-1 and ADR 1 again.' });
    const graph = buildDecisionGraph(listRecords(root));
    expect(graph.referenceEdges).toEqual([{ from: 2, to: 1 }]);
    expect(graph.nodes.find((node) => node.number === 2)?.references).toEqual([1]);
  });

  it('ignores self references and numbers that are not decisions', () => {
    const root = makeRepo();
    writeDecision(root, 3, 'Lone', { date: '2026-08-17', decisionBody: 'See ADR-3 itself and ADR-99.' });
    const graph = buildDecisionGraph(listRecords(root));
    expect(graph.referenceEdges).toEqual([]);
    expect(graph.nodes.find((node) => node.number === 3)?.references).toEqual([]);
  });

  it('drops a mined edge duplicated by a formal supersede edge, in either direction', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Old', { date: '2026-08-17', status: 'superseded', supersededBy: 2 });
    writeDecision(root, 2, 'New', { date: '2026-08-19', decisionBody: 'Replaces ADR-1.' });
    const graph = buildDecisionGraph(listRecords(root));
    expect(graph.supersedeEdges).toEqual([{ from: 1, to: 2 }]);
    expect(graph.referenceEdges).toEqual([]);
  });

  it('formalOnly drops every reference edge but keeps supersede edges', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Old', { date: '2026-08-17', status: 'superseded', supersededBy: 2 });
    writeDecision(root, 2, 'New', { date: '2026-08-19', decisionBody: 'Replaces ADR-1.' });
    writeDecision(root, 3, 'Side', { date: '2026-08-19', decisionBody: 'Unrelated to ADR-1.' });
    const graph = buildDecisionGraph(listRecords(root), { formalOnly: true });
    expect(graph.referenceEdges).toEqual([]);
    expect(graph.supersedeEdges).toEqual([{ from: 1, to: 2 }]);
    expect(graph.nodes.every((node) => node.references.length === 0)).toBe(true);
  });
});

describe('graphCommand formats', () => {
  function fixtureRepo(): string {
    const root = makeRepo();
    writeDecision(root, 1, 'Old', { date: '2026-08-17', status: 'superseded', supersededBy: 3 });
    writeDecision(root, 2, 'Base', { date: '2026-08-17', decisionBody: 'Builds on ADR-1.' });
    writeDecision(root, 3, 'New', { date: '2026-08-19', decisionBody: 'Replaces ADR-1, builds on ADR-2.' });
    return root;
  }

  it('emits an exact Mermaid document by default', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-17' });
    writeDecision(root, 2, 'Second', { date: '2026-08-17', decisionBody: 'Builds on ADR-1.' });
    expect(graphCommand(root, {})).toBe(`flowchart LR
  subgraph D20260817["2026-08-17 (2)"]
    direction TB
    n1["1 First"]
    n2["2 Second"]
  end

  n2 -.-> n1

  click n1 "adr/decisions/1-first.md"
  click n2 "adr/decisions/2-second.md"`);
  });

  it('groups by date, styles superseded nodes, and links formal and mined edges', () => {
    const root = fixtureRepo();
    const output = graphCommand(root, {});
    expect(output).toContain('subgraph D20260817["2026-08-17 (2)"]');
    expect(output).toContain('subgraph D20260819["2026-08-19 (1)"]');
    expect(output).toContain('n1 ==>|superseded by| n3');
    expect(output).toContain('n2 -.-> n1');
    // 3 mentions 1, but the formal 1->3 pair already covers it: no duplicate.
    expect(output).not.toContain('n3 -.-> n1');
    expect(output).toContain('n3 -.-> n2');
    expect(output).toContain('classDef retired');
    expect(output).toContain('class n1 retired');
    expect(output).toContain('click n1 "adr/decisions/1-old.md"');
  });

  it('emits a Graphviz digraph with --dot', () => {
    const root = fixtureRepo();
    const output = graphCommand(root, { dot: true });
    expect(output.startsWith('digraph decisions {')).toBe(true);
    expect(output).toContain('rankdir=LR');
    expect(output).toContain('label="2026-08-17 (2)"');
    expect(output).toContain('rank=same');
    expect(output).toContain('n1 -> n3 [label="superseded by"]');
    expect(output).toContain('n2 -> n1 [style=dashed]');
    expect(output.trimEnd().endsWith('}')).toBe(true);
  });

  it('exposes the full graph as JSON with --json', () => {
    const root = fixtureRepo();
    const parsed = JSON.parse(graphCommand(root, { json: true })) as {
      decisions: Array<{ number: number; references: number[]; supersededBy?: number }>;
      supersedeEdges: Array<{ from: number; to: number }>;
      referenceEdges: Array<{ from: number; to: number }>;
    };
    expect(parsed.decisions.map((decision) => decision.number)).toEqual([1, 2, 3]);
    expect(parsed.decisions.find((decision) => decision.number === 1)?.supersededBy).toBe(3);
    expect(parsed.decisions.find((decision) => decision.number === 3)?.references).toEqual([2]);
    expect(parsed.supersedeEdges).toEqual([{ from: 1, to: 3 }]);
    expect(parsed.referenceEdges).toEqual([
      { from: 2, to: 1 },
      { from: 3, to: 2 },
    ]);
  });

  it('suppresses mined edges with --formal-only', () => {
    const root = fixtureRepo();
    const parsed = JSON.parse(graphCommand(root, { json: true, formalOnly: true })) as {
      referenceEdges: unknown[];
      supersedeEdges: unknown[];
    };
    expect(parsed.referenceEdges).toEqual([]);
    expect(parsed.supersedeEdges).toEqual([{ from: 1, to: 3 }]);
  });

  it('rejects conflicting format flags naming both', () => {
    const root = makeRepo();
    expect(() => graphCommand(root, { mermaid: true, dot: true })).toThrow(
      /--mermaid and --dot are mutually exclusive/,
    );
  });

  it('requires an ADR Kit repository', () => {
    const empty = mkdtempSync(join(tmpdir(), 'adrkit-empty-'));
    tempDirs.push(empty);
    expect(() => graphCommand(empty, {})).toThrow(/no ADR Kit repository found/);
  });

  it('excludes drafts from the graph', () => {
    const root = fixtureRepo();
    mkdirSync(join(root, 'adr', '.drafts'), { recursive: true });
    writeFileSync(
      join(root, 'adr', '.drafts', '2026-08-19-side-quest.md'),
      `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Side quest

## Problem

p

## Proposal

pr

## Alternatives considered

a

## Acceptance criteria

ac

## Risks

r
`,
    );
    const parsed = JSON.parse(graphCommand(root, { json: true })) as {
      decisions: Array<{ number: number }>;
    };
    expect(parsed.decisions.map((decision) => decision.number)).toEqual([1, 2, 3]);
  });
});

describe('cli graph surface', () => {
  it('runs through main and exits non-zero on conflicting format flags', () => {
    const root = makeRepo();
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      process.chdir(root);
      process.exitCode = undefined;
      main(['graph', '--mermaid', '--dot']);
      expect(process.exitCode).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain('mutually exclusive');
      main(['graph']);
      expect((logSpy.mock.calls[0]?.[0] as string).startsWith('flowchart LR')).toBe(true);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

describe('created grouping, tags, and tree output', () => {
  it('groups by created date, not the status date', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Founding', { date: '2026-08-19', created: '2026-08-17' });
    writeDecision(root, 2, 'Later', { date: '2026-08-19' });
    const output = graphCommand(root, {});
    expect(output).toContain('subgraph D20260817["2026-08-17 (1)"]');
    expect(output).toContain('subgraph D20260819["2026-08-19 (1)"]');
  });

  it('emits an exact terminal tree with --text', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Old', { date: '2026-08-19', created: '2026-08-17', status: 'superseded', supersededBy: 3, tags: ['adr'] });
    writeDecision(root, 2, 'Base', { date: '2026-08-17', tags: ['execution'] });
    writeDecision(root, 3, 'New', { date: '2026-08-19', created: '2026-08-19', decisionBody: 'Builds on ADR-1.' });
    expect(graphCommand(root, { text: true })).toBe(`Decisions
├── 2026-08-17 (2)
│   ├── 1 Old  [superseded by 3; adr]
│   └── 2 Base  [execution]
└── 2026-08-19 (1)
    └── 3 New`);
  });

  it('filters to one theme with --tag in every format', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Sandbox', { date: '2026-08-17', tags: ['execution', 'sandbox'] });
    writeDecision(root, 2, 'Frontend', { date: '2026-08-17', tags: ['frontend'] });
    writeDecision(root, 3, 'Uses sandbox', { date: '2026-08-19', decisionBody: 'Builds on ADR-1.', tags: ['execution'] });
    const parsed = JSON.parse(graphCommand(root, { json: true, tag: 'execution' })) as {
      decisions: Array<{ number: number }>;
      referenceEdges: Array<{ from: number; to: number }>;
    };
    expect(parsed.decisions.map((decision) => decision.number)).toEqual([1, 3]);
    expect(parsed.referenceEdges).toEqual([{ from: 3, to: 1 }]);
    const tree = graphCommand(root, { text: true, tag: 'execution' });
    expect(tree).not.toContain('2 Frontend');
  });

  it('colors active nodes by their first tag in mermaid', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Sandbox', { date: '2026-08-17', tags: ['execution'] });
    writeDecision(root, 2, 'Frontend', { date: '2026-08-17', tags: ['frontend'] });
    writeDecision(root, 3, 'Retired', { date: '2026-08-17', status: 'superseded', supersededBy: 1, tags: ['execution'] });
    const output = graphCommand(root, {});
    expect(output).toContain('classDef tag-0 stroke:#0e7490,color:#0e7490');
    expect(output).toContain('classDef tag-1 stroke:#b45309,color:#b45309');
    expect(output).toContain('class n1 tag-0');
    expect(output).toContain('class n2 tag-1');
    // superseded nodes stay gray: no tag class for n3
    expect(output).not.toContain('n3 tag-');
    expect(output).toContain('class n3 retired');
  });

  it('exposes created and tags in the JSON graph', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-19', created: '2026-08-17', tags: ['execution'] });
    const parsed = JSON.parse(graphCommand(root, { json: true })) as {
      decisions: Array<{ created: string; tags: string[] }>;
    };
    expect(parsed.decisions[0]?.created).toBe('2026-08-17');
    expect(parsed.decisions[0]?.tags).toEqual(['execution']);
  });
});
