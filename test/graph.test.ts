import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { graphCommand } from '../src/commands/graph.js';
import { treeCommand } from '../src/commands/tree.js';
import { initCommand } from '../src/commands/init.js';
import { buildDecisionGraph } from '../src/core/graph.js';
import { listRecords } from '../src/core/repository.js';
import { slugify } from '../src/core/slug.js';

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
  /** Appended as a ## Deliberation appendix. */
  deliberation?: string;
  /** Writes a record with no `created` field, for the invalid-input path. */
  omitCreated?: boolean;
}

function writeDecision(root: string, number: number, title: string, options: DecisionOptions): void {
  const superseded = options.supersededBy === undefined ? '' : `\nsuperseded-by: ${options.supersededBy}`;
  const tags = options.tags === undefined ? '' : `\ntags: [${options.tags.join(', ')}]`;
  const created = options.omitCreated === true ? '' : `\ncreated: ${options.created ?? options.date}`;
  const content = `---
status: ${options.status ?? 'implemented'}
date: ${options.date}${created}${superseded}${tags}
---

# ADR: ${number} ${title}

## Problem

p

## Decision

${options.decisionBody ?? 'd'}

## Alternatives considered

a

## Consequences

c${options.deliberation === undefined ? '' : '\n\n## Deliberation\n\n' + options.deliberation}
`;
  const dir = join(root, 'adr', options.status === 'superseded' ? 'archived' : 'implemented');
  mkdirSync(dir, { recursive: true });
  // Name the file through the real slug: a hand-rolled `replaceAll(' ', '-')`
  // keeps characters Windows forbids in a file name (`<`, `>`, `:`), which is
  // how a title like "Bold & <markup>" broke the Windows runner.
  writeFileSync(join(dir, `${number}-${slugify(title)}.md`), content);
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

  it('ignores self references and numbers that are not implemented', () => {
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

function fixtureRepo(): string {
  const root = makeRepo();
  writeDecision(root, 1, 'Old', { date: '2026-08-17', status: 'superseded', supersededBy: 3 });
  writeDecision(root, 2, 'Base', { date: '2026-08-17', decisionBody: 'Builds on ADR-1.' });
  writeDecision(root, 3, 'New', { date: '2026-08-19', decisionBody: 'Replaces ADR-1, builds on ADR-2.' });
  return root;
}

describe('graphCommand formats', () => {
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

  click n1 "adr/implemented/1-first.md"
  click n2 "adr/implemented/2-second.md"`);
    // references only — no formal edges, so no linkStyle is emitted
    expect(graphCommand(root, {})).not.toContain('linkStyle');
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
    expect(output).toContain('click n1 "adr/archived/1-old.md"');
    // the one formal edge gets a long-dash override via linkStyle
    expect(output).toContain('linkStyle 0 stroke-dasharray:11 7');
    // reference edges keep their default style: no linkStyle targets them
    expect(output).not.toMatch(/linkStyle \d+[^0]\s/);
  });

  it('indexes one linkStyle per formal edge, references untouched', () => {
    const root = makeRepo();
    // two formal supersede edges, declared 1->3 then 2->4
    writeDecision(root, 1, 'Old1', { date: '2026-08-17', status: 'superseded', supersededBy: 3 });
    writeDecision(root, 2, 'Old2', { date: '2026-08-17', status: 'superseded', supersededBy: 4 });
    writeDecision(root, 3, 'New1', { date: '2026-08-19', decisionBody: 'Builds on ADR-1.' });
    writeDecision(root, 4, 'New2', { date: '2026-08-19', decisionBody: 'Builds on ADR-3.' });
    const output = graphCommand(root, {});
    expect(output).toContain('linkStyle 0 stroke-dasharray:11 7');
    expect(output).toContain('linkStyle 1 stroke-dasharray:11 7');
    expect(output).toContain('n1 ==>|superseded by| n3');
    expect(output).toContain('n2 ==>|superseded by| n4');
    // references still render, and only the two formal edges get linkStyles
    const matches = output.match(/linkStyle \d+ stroke-dasharray:11 7/g) ?? [];
    expect(matches.length).toBe(2);
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

  it('builds the full graph model with nodes and edges', () => {
    const root = fixtureRepo();
    const graph = buildDecisionGraph(listRecords(root), {});
    expect(graph.nodes.map((node) => node.number)).toEqual([1, 2, 3]);
    expect(graph.nodes.find((node) => node.number === 1)?.supersededBy).toBe(3);
    expect(graph.nodes.find((node) => node.number === 3)?.references).toEqual([2]);
    expect(graph.supersedeEdges).toEqual([{ from: 1, to: 3 }]);
    expect(graph.referenceEdges).toEqual([
      { from: 2, to: 1 },
      { from: 3, to: 2 },
    ]);
  });

  it('suppresses mined edges with --formal-only', () => {
    const root = fixtureRepo();
    const graph = buildDecisionGraph(listRecords(root), { formalOnly: true });
    expect(graph.referenceEdges).toEqual([]);
    expect(graph.supersedeEdges).toEqual([{ from: 1, to: 3 }]);
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
    mkdirSync(join(root, 'adr', 'proposed'), { recursive: true });
    writeFileSync(
      join(root, 'adr', 'proposed', '2026-08-19-side-quest.md'),
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
    const graph = buildDecisionGraph(listRecords(root), {});
    expect(graph.nodes.map((node) => node.number)).toEqual([1, 2, 3]);
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

  it('marks a plain archived decision in --text', () => {
    const root = makeRepo();
    const dir = join(root, 'adr', 'archived');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '1-retired.md'), `---
status: implemented
date: 2026-08-17
created: 2026-08-17
archived: 2026-08-17
archive-reason: current behavior has another authoritative owner
---

# ADR: 1 Retired

## Problem

p

## Decision

d

## Alternatives considered

a

## Consequences

c
`);
    expect(graphCommand(root, { text: true })).toBe(`Decisions
└── 2026-08-17 (1)
    └── 1 Retired  [archived]`);
  });

  it('filters to one theme with --tag in every format', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Sandbox', { date: '2026-08-17', tags: ['execution', 'sandbox'] });
    writeDecision(root, 2, 'Frontend', { date: '2026-08-17', tags: ['frontend'] });
    writeDecision(root, 3, 'Uses sandbox', { date: '2026-08-19', decisionBody: 'Builds on ADR-1.', tags: ['execution'] });
    const graph = buildDecisionGraph(listRecords(root), { tag: 'execution' });
    expect(graph.nodes.map((node) => node.number)).toEqual([1, 3]);
    expect(graph.referenceEdges).toEqual([{ from: 3, to: 1 }]);
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

  it('carries created and tags into the graph model', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-19', created: '2026-08-17', tags: ['execution'] });
    const graph = buildDecisionGraph(listRecords(root), {});
    expect(graph.nodes[0]?.created).toBe('2026-08-17');
    expect(graph.nodes[0]?.tags).toEqual(['execution']);
  });

  it('reports a record with no created date instead of substituting its status date', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'No created', { date: '2026-08-19', omitCreated: true });
    expect(() => graphCommand(root, {})).toThrow(/has no "created" date/);
    expect(() => graphCommand(root, { html: true })).toThrow(/has no "created" date/);
  });
});

describe('graph output file', () => {
  it('resolves record links from the directory the map lands in', () => {
    const root = fixtureRepo();
    mkdirSync(join(root, 'reports'), { recursive: true });
    const target = join(root, 'reports', 'map.html');
    expect(graphCommand(root, { html: true, out: 'reports/map.html' })).toBe('wrote ' + target);
    const html = readFileSync(target, 'utf8');
    // Relative to the map, not to the repository root: the cards have to open
    // from wherever the file was written.
    expect(html).toContain('href="../adr/archived/1-old.md"');
    expect(existsSync(target)).toBe(true);
  });

  it('writes absolute file:// links when the map lands outside the repository', () => {
    const root = fixtureRepo();
    const dir = mkdtempSync(join(tmpdir(), 'adrkit-out-'));
    tempDirs.push(dir);
    const target = join(dir, 'map.html');
    graphCommand(root, { html: true, out: target });
    const html = readFileSync(target, 'utf8');
    // The URL is the record's real path, which is what a browser resolves.
    const record = join(realpathSync(root), 'adr', 'archived', '1-old.md');
    expect(html).toContain('href="' + pathToFileURL(record).href + '"');
    expect(html).not.toContain('href="../adr');
  });

  it('writes other formats to the same path and rejects a missing directory', () => {
    const root = fixtureRepo();
    const target = join(root, 'map.mmd');
    expect(graphCommand(root, { out: target })).toBe('wrote ' + target);
    expect(readFileSync(target, 'utf8').startsWith('flowchart LR')).toBe(true);
    expect(() => graphCommand(root, { html: true, out: 'missing/map.html' })).toThrow(/does not exist/);
  });
});

describe('graph HTML map', () => {
  it('emits one offline document with nodes, edges, and deliberation markers', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Grilled', { date: '2026-08-17', tags: ['core'], deliberation: '- Q: Which store? [settled]\n  - A: SQLite [settled]' });
    writeDecision(root, 2, 'Plain', { date: '2026-08-17', tags: ['api'], decisionBody: 'Builds on ADR-1.' });
    writeDecision(root, 3, 'Retired', { date: '2026-08-18', status: 'superseded', supersededBy: 2, tags: ['core'] });
    const html = graphCommand(root, { html: true });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<svg');
    expect(html).toContain('data-adr="1"');
    expect(html).toContain('data-adr="2"');
    expect(html).toContain('data-has-deliberation="true"');
    expect(html).toContain('data-has-deliberation="false"');
    expect(html).toContain('class="node has-deliberation"');
    expect(html).toContain('class="node superseded"');
    expect(html).toContain('class="edge reference"');
    expect(html).toContain('class="edge supersede"');
    expect(html).toContain('href="adr/implemented/1-grilled.md"');
    expect(html).toContain('has deliberation tree');
    expect(html).toContain('id="viewport"');
    expect(html).toContain('id="world"');
    expect(html).toContain('id="fit"');
    // The toolbar stays compact: the legend, the statistics, and the zoom
    // cluster float over the canvas in the dock instead of owning rows.
    const header = html.match(/<header class="viewer-bar">([\s\S]*?)<\/header>/)?.[1];
    expect(header).toContain('<details class="viewer-info"><summary aria-label="View information"');
    expect(header).not.toContain('>Info<');
    expect(header).toContain('<a class="viewer-brand" href="https://github.com/luochang212/adr-kit" target="_blank" rel="noopener noreferrer"');
    expect(header).toContain('<strong>3</strong>decisions');
    expect(header).toContain('<button id="share" class="js-control" aria-label="Save as image" title="Save as image">');
    expect(header.indexOf('viewer-info')).toBeLessThan(header.indexOf('id="share"'));
    expect(header).toContain('id="instructions"');
    expect(header).not.toContain('id="fit"');
    expect(html).toContain('luochang212/adr-kit');
    // The same shared rule the tree relies on; the map's own stylesheet must
    // not be the only reason its toolbar icons line up.
    expect(html).toContain('.viewer-bar button svg, .viewer-bar summary svg { display: block; }');
    expect(html).toContain('<div class="canvas-dock">');
    const dock = html.match(/<div class="canvas-dock">([\s\S]*?)<\/main>/)?.[1];
    expect(dock).toContain('class="legend"');
    expect(dock).toContain('superseded by');
    expect(dock).toContain('id="fit"');
    expect(html.indexOf('id="world"')).toBeLessThan(html.indexOf('class="canvas-dock"'));
    // The shared canvas pans from anywhere except real controls — node links
    // included: a moved press pans, a still press opens the record (ADR 11).
    expect(html).toContain(
      "closest('button, summary, input, select, textarea, .controls, .canvas-legend')",
    );
    expect(html).not.toContain("closest('button, summary, a");
    expect(html).toContain('CLICK_SLOP');
    expect(html).toMatch(/\.interactive main \{[^}]*user-select: none/);
    expect(html).not.toContain('<section class="intro">');
    expect(html).not.toContain('<footer>');
    expect(html.match(/id="fit"/g)).toHaveLength(1);
    expect(html.match(/id="instructions"/g)).toHaveLength(1);

    expect(html).toContain('event.ctrlKey');
    expect(html).toContain('event.metaKey');
    expect(html).toContain('<script>');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toContain('cdn');
  });

  it('keys only the legend entries and statistics the map supports', () => {
    const root = makeRepo();
    // One plain decision supersedes nothing, references nothing, and carries no
    // tree: every legend key and every extra count would name something the map
    // does not draw.
    writeDecision(root, 1, 'Alone', { date: '2026-08-17' });
    const html = graphCommand(root, { html: true });
    expect(html).not.toContain('class="canvas-legend"');
    expect(html).not.toContain('superseded by');
    expect(html).not.toContain('references</span>');
    expect(html).not.toContain('has deliberation tree');
    expect(html).toContain('id="fit"');
    const stats = html.match(/<div class="viewer-stats">([\s\S]*?)<\/div>/)![1]!;
    expect(stats).toContain('<strong>1</strong>decisions');
    expect(stats).not.toContain('supersessions');
    expect(stats).not.toContain('deliberation trees');
  });

  it('groups columns by created date and reports the counts', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-19', created: '2026-08-17' });
    writeDecision(root, 2, 'Later', { date: '2026-08-19' });
    const html = graphCommand(root, { html: true });
    expect(html).toContain('2026-08-17 (1)');
    expect(html).toContain('2026-08-19 (1)');
    expect(html).toContain('<strong>2</strong>decisions');
  });

  it('escapes record text and shows an empty state', () => {
    const root = makeRepo();
    expect(graphCommand(root, { html: true })).toContain('No decisions yet.');
    writeDecision(root, 1, 'Bold & <markup>', { date: '2026-08-17' });
    const html = graphCommand(root, { html: true });
    expect(html).toContain('Bold &amp; &lt;markup&gt;');
    expect(html).not.toContain('<markup>');
  });

  it('wraps a title that has no spaces instead of overflowing the card', () => {
    const root = makeRepo();
    writeDecision(root, 1, '一个非常长的中文标题用来测试决策图的自动换行是否能够正确处理', { date: '2026-08-17' });
    const html = graphCommand(root, { html: true });
    const titles = html.match(/<text class="title"[^>]*>[^<]*<\/text>/g) ?? [];
    expect(titles.length).toBeGreaterThan(1);
    for (const line of titles) {
      // Wide characters count double, so a 248px card holds well under 20 of them.
      expect(Array.from(line.replace(/<[^>]+>/g, '')).length).toBeLessThan(20);
    }
  });

  it('keeps the tag run clear of the deliberation marker and the card edge', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Wide', {
      date: '2026-08-17',
      tags: ['deliberation', 'visualization', 'agent-integration'],
      deliberation: '- Q: Which store? [settled]\n  - A: SQLite [settled]',
    });
    writeDecision(root, 2, 'Short', { date: '2026-08-17', tags: ['core'] });
    const html = graphCommand(root, { html: true });
    const runs = (html.match(/<text class="tag"[^>]*>[^<]*<\/text>/g) ?? []).map((run) => run.replace(/<[^>]+>/g, ''));
    expect(runs).toHaveLength(2);
    // The deliberation marker is the card's pale green fill, not a footer
    // element, so both runs get the card's whole 216px of inner width. At the
    // font these views resolve to — about 4.74px per Latin character at 10px —
    // the run has to fit that width.
    expect(runs[0]!.length * 4.74).toBeLessThanOrEqual(216);
    expect(runs[1]!.length * 4.74).toBeLessThanOrEqual(216);
    // Every tagged card clips its run, so a wider fallback font cannot paint
    // over the card edge.
    expect(html.match(/<clipPath id="tags-\d+"/g)).toHaveLength(2);
    // The tint is the marker, spelled out by the legend.
    expect(html).toMatch(/\.node\.has-deliberation rect \{\s*fill: #edf6ef/);
    expect(html).not.toContain('>deliberation</text>');
    // The run fills the row up to the card's edge before it cuts.
    expect(runs[0]).toContain('…');
    expect(runs[0]!.startsWith('#deliberation')).toBe(true);
    expect(runs[1]).toBe('#core');
  });

  /** Every point along every drawn edge, sampled from the cubic in its path. */
  function edgeSamples(html: string, steps = 200): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    for (const path of html.match(/<path class="edge[^"]*" d="[^"]+"/g) ?? []) {
      const [sx, sy, c1x, c1y, c2x, c2y, tx, ty] = (path.match(/-?[\d.]+/g) ?? []).map(Number) as [
        number, number, number, number, number, number, number, number,
      ];
      for (let step = 0; step <= steps; step++) {
        const t = step / steps, u = 1 - t;
        points.push([
          u ** 3 * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * tx,
          u ** 3 * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ty,
        ]);
      }
    }
    return points;
  }

  /**
   * The map's drawing box. The toolbar carries other inline SVGs (the Info
   * glyph), so this matches the map element rather than the first viewBox.
   */
  function mapBox(html: string): { minX: number; minY: number; maxX: number; maxY: number } {
    const tag = html.match(/<svg[^>]*aria-label="Decision map"[^>]*>/)?.[0] ?? '';
    const box = tag.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
    expect(box).not.toBeNull();
    const [minX, minY, width, height] = box!.slice(1).map(Number) as [number, number, number, number];
    return { minX, minY, maxX: minX + width, maxY: minY + height };
  }

  /** The card grid's extent, read off the node rects. */
  function cardSpan(html: string): { left: number; right: number } {
    const rects = [...html.matchAll(
      /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="12"/g,
    )];
    expect(rects.length).toBeGreaterThan(0);
    return {
      left: Math.min(...rects.map((m) => Number(m[1]))),
      right: Math.max(...rects.map((m) => Number(m[1]) + Number(m[3]))),
    };
  }

  it('keeps backward references inside the card grid without outward detours', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-17' });
    writeDecision(root, 2, 'Bridge', { date: '2026-08-19', decisionBody: 'Builds on ADR-1.' });
    writeDecision(root, 3, 'Latest', { date: '2026-08-21', decisionBody: 'Also builds on ADR-1.' });
    const html = graphCommand(root, { html: true });
    // Backward references leave the left side and enter the right side, so
    // they no longer swing beyond the outer columns.
    expect(html.match(/<path class="edge[^"]*" d="[^"]+"/g) ?? []).toHaveLength(2);
    const box = mapBox(html);
    const samples = edgeSamples(html);
    for (const [x, y] of samples) {
      expect(x).toBeGreaterThanOrEqual(box.minX);
      expect(x).toBeLessThanOrEqual(box.maxX);
      expect(y).toBeGreaterThanOrEqual(box.minY);
      expect(y).toBeLessThanOrEqual(box.maxY);
    }
    const grid = cardSpan(html);
    for (const [x] of samples) {
      expect(x).toBeGreaterThanOrEqual(grid.left);
      expect(x).toBeLessThanOrEqual(grid.right);
    }
  });

  it('routes by direction and gives incident edges distinct card ports', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'First', { date: '2026-08-17', decisionBody: 'See ADR-3.' });
    writeDecision(root, 2, 'Same date', { date: '2026-08-17', decisionBody: 'See ADR-1.' });
    writeDecision(root, 3, 'Later', { date: '2026-08-18', decisionBody: 'See ADR-1 and ADR-2.' });
    const html = graphCommand(root, { html: true });
    const paths = [...html.matchAll(/<path class="edge [^"]+" d="([^"]+)" data-from="(\d+)" data-to="(\d+)"/g)];
    expect(paths).toHaveLength(4);
    const ports = new Map<string, number[]>();
    for (const [, d, from, to] of paths) {
      const [sx, sy, c1x, , c2x, , tx, ty] = d!.match(/-?[\d.]+/g)!.map(Number) as [number, number, number, number, number, number, number, number];
      if (from === '2' && to === '1') {
        expect(sx).toBe(tx); // same-date loop stays to the right
        expect(c1x).toBeGreaterThan(sx);
        expect(c2x).toBeGreaterThan(tx);
      } else if (from === '1') {
        expect(sx).toBeLessThan(tx);
        expect(c1x).toBeGreaterThan(sx);
        expect(c2x).toBeLessThan(tx);
      } else {
        expect(sx).toBeGreaterThan(tx);
        expect(c1x).toBeLessThan(sx);
        expect(c2x).toBeGreaterThan(tx);
      }
      for (const [id, x, y] of [[from!, sx, sy], [to!, tx, ty]] as const) {
        const key = id + ':' + x;
        ports.set(key, [...(ports.get(key) ?? []), y]);
      }
    }
    for (const ys of ports.values()) expect(new Set(ys).size).toBe(ys.length);
  });

  it('sizes the drawing box to the drawn curves for every map shape', () => {
    // The shapes a decision map can take: no edges at all, a forward run, a
    // reference that reaches back one date and one that reaches back three, a
    // crowded single date, and a same-date pair whose edge swings inside its
    // own column gutter.
    const shapes: Record<string, Array<{ created: string; refs?: number[] }>> = {
      'a single date': [{ created: '2026-08-01' }, { created: '2026-08-01' }, { created: '2026-08-01' }],
      'a same-date reference': [{ created: '2026-08-01' }, { created: '2026-08-01', refs: [1] }],
      'adjacent dates, forward only': [
        { created: '2026-08-01' }, { created: '2026-08-02', refs: [1] }, { created: '2026-08-03', refs: [2] },
      ],
      'a reference back one date': [
        { created: '2026-08-01' }, { created: '2026-08-02' }, { created: '2026-08-03', refs: [2] },
      ],
      'a reference back three dates': [
        { created: '2026-08-01' }, { created: '2026-08-02' }, { created: '2026-08-03' },
        { created: '2026-08-04', refs: [1] },
      ],
      'five dates crossing both ways': [
        { created: '2026-08-01' }, { created: '2026-08-02', refs: [1] }, { created: '2026-08-03' },
        { created: '2026-08-04', refs: [1] }, { created: '2026-08-05', refs: [3] },
      ],
    };
    for (const [name, plan] of Object.entries(shapes)) {
      const build = (withRefs: boolean): string => {
        const root = makeRepo();
        plan.forEach((entry, index) => {
          writeDecision(root, index + 1, `Decision ${index + 1}`, {
            date: entry.created,
            decisionBody: withRefs
              ? (entry.refs ?? []).map((ref) => `Builds on ADR-${ref}.`).join(' ')
              : '',
          });
        });
        return graphCommand(root, { html: true });
      };
      const html = build(true);
      const box = mapBox(html);
      const cards = cardSpan(html);
      const samples = edgeSamples(html);
      for (const [x, y] of samples) {
        expect(x, `${name}: x`).toBeGreaterThanOrEqual(box.minX);
        expect(x, `${name}: x`).toBeLessThanOrEqual(box.maxX);
        expect(y, `${name}: y`).toBeGreaterThanOrEqual(box.minY);
        expect(y, `${name}: y`).toBeLessThanOrEqual(box.maxY);
      }
      // The box hugs the cards and the curves plus the drawing margin and the
      // layout's own mirrored margin on the right. A hull-sized box overshoots
      // that right bound by hundreds of pixels.
      const xs = samples.map(([x]) => x);
      const drawnLeft = Math.min(cards.left, ...xs);
      const drawnRight = Math.max(cards.right, ...xs);
      expect(Math.abs(box.minX - (Math.min(0, drawnLeft) - 16)), `${name}: left`).toBeLessThanOrEqual(1);
      expect(
        Math.abs(box.maxX - (Math.max(cards.right + cards.left, drawnRight) + 16)),
        `${name}: right`,
      ).toBeLessThanOrEqual(1);
      // Only the sides need the room: the curves never move the vertical box.
      const plain = mapBox(build(false));
      expect(box.minY, `${name}: top`).toBe(plain.minY);
      expect(box.maxY, `${name}: bottom`).toBe(plain.maxY);
    }
  });

  it('marks only appendices that parse to a tree, matching the tree command', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'Prose', { date: '2026-08-17', deliberation: 'Prose only, no bullet tree.' });
    writeDecision(root, 2, 'Tree', { date: '2026-08-17', deliberation: '- Q: Which store? [settled]\n  - A: SQLite [settled]' });
    const html = graphCommand(root, { html: true });
    expect(html).toContain('data-adr="1" data-has-deliberation="false"');
    expect(html).toContain('data-adr="2" data-has-deliberation="true"');
    expect(() => treeCommand('1', root, 'html')).toThrow(/no "## Deliberation" tree/);
    expect(treeCommand('2', root, 'html')).toContain('<!doctype html>');
  });

  it('exposes --html through main and rejects it beside another format', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'One', { date: '2026-08-17' });
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      process.chdir(root);
      process.exitCode = undefined;
      main(['graph', '--html']);
      expect(String(logSpy.mock.calls[0]?.[0]).startsWith('<!doctype html>')).toBe(true);
      main(['graph', '--html', '--mermaid']);
      expect(process.exitCode).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain('mutually exclusive');
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('rejects two format flags on tree instead of silently picking one', () => {
    const root = makeRepo();
    writeDecision(root, 1, 'One', {
      date: '2026-08-17',
      deliberation: '- Q: Which store? [settled]\n  - A: SQLite [settled]',
    });
    const previousCwd = process.cwd();
    const previousExitCode = process.exitCode;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      process.chdir(root);
      process.exitCode = undefined;
      main(['tree', '1', '--html', '--mermaid']);
      expect(process.exitCode).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain('mutually exclusive');
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
