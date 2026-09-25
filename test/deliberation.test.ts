import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { treeCommand } from '../src/commands/tree.js';
import {
  parseDeliberation,
  renderDeliberationHtml,
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

const BODY = [
  '- Grilling provenance [settled]',
  '  - Q: Should a grilling session be a persisted entity? [settled]',
  '    - A: Do not persist it [rejected] \u2014 keep only the distilled ADR',
  '    - A: Embed the tree in the ADR [settled] (recommended)',
  '    - A: A separate session object [rejected]',
  '  - Q: What data shape carries it? [settled]',
  '    - A: A fenced YAML tree [rejected] (recommended) \u2014 unreadable in the raw record',
  '    - A: An annotated outline [settled]',
].join('\n');

describe('parseDeliberation', () => {
  it('reads type, status, recommendation, and reason', () => {
    const nodes = parseDeliberation(BODY);
    expect(nodes).toHaveLength(1);
    const question = nodes[0]!.children[0]!;
    expect(question.type).toBe('question');
    const [rejected, implemented] = question.children;
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.reason).toBe('keep only the distilled ADR');
    expect(implemented!.status).toBe('settled');
    expect(implemented!.recommended).toBe(true);
  });

  it('infers type when the marker is omitted', () => {
    const nodes = parseDeliberation('- root [settled]\n  - parent [settled]\n    - leaf [rejected]');
    const text = renderDeliberationText(nodes);
    expect(text).toContain('Q: parent');
    expect(text).toContain('A: leaf');
  });

  it('treats an unknown parenthetical as text, not syntax', () => {
    const nodes = parseDeliberation('- Q: Where? [settled] (note 2) (recommended) — Keep it local');
    expect(nodes).toEqual([{
      text: 'Where?  (note 2)', type: 'question', status: 'settled',
      recommended: true, reason: 'Keep it local', children: [],
    }]);
    expect(renderDeliberationMermaid(nodes)).not.toContain('subgraph');
  });

  it('is empty for an absent or non-list body', () => {
    expect(parseDeliberation(undefined)).toEqual([]);
    expect(parseDeliberation('just prose')).toEqual([]);
  });

  it('never splits the reason on a hyphen, so a hyphen cannot hide the state', () => {
    // Only the em dash separates the reason. A ` - ` in the text is prose, so
    // it cannot cut `[settled]` and `(recommended)` into the reason.
    const nodes = parseDeliberation('- A: Postgres - it is proven [settled] (recommended)');
    expect(nodes).toEqual([{
      text: 'Postgres - it is proven', type: 'option', status: 'settled',
      recommended: true, children: [],
    }]);
  });
});

describe('override detection', () => {
  it('marks a question whose settled option is not the recommendation', () => {
    const nodes = parseDeliberation([
      '- Q: Pick one [settled]',
      '  - A: First [rejected] (recommended)',
      '  - A: Second [settled]',
    ].join('\n'));
    expect(renderDeliberationText(nodes)).toContain('(override)');
  });

  it('does not mark a question that took the recommendation', () => {
    const nodes = parseDeliberation([
      '- Q: Pick one [settled]',
      '  - A: First [rejected]',
      '  - A: Second [settled] (recommended)',
    ].join('\n'));
    expect(renderDeliberationText(nodes)).not.toContain('(override)');
  });
});

describe('nested dependency', () => {
  const NESTED = [
    '- Root decision [settled]',
    '  - Q: Independent? [settled]',
    '    - A: yes [settled]',
    '  - Q: Which option? [settled]',
    '    - A: Chosen [settled] (recommended)',
    '      - Q: Raised by the choice? [settled]',
    '        - A: yes [settled]',
  ].join('\n');

  it('keeps a follow-up question under the node that raised it', () => {
    const [root] = parseDeliberation(NESTED);
    const option = root!.children[1]!.children[0]!;
    expect(option.type).toBe('option');
    expect(option.children[0]!.type).toBe('question');
    expect(option.children[0]!.text).toBe('Raised by the choice?');
  });

  it('indents the dependency by depth', () => {
    const lines = renderDeliberationText(parseDeliberation(NESTED)).split('\n');
    const deep = lines.find((line) => line.includes('Raised by the choice?'))!;
    expect(deep.startsWith('      - Q: ')).toBe(true);
  });

  it('styles the unlock edge and leaves containment alone', () => {
    const mermaid = renderDeliberationMermaid(parseDeliberation(NESTED));
    const edges = mermaid.split('\n').filter((line) => line.includes(' --> '));
    expect(edges[4]).toBe('  n5 --> n6');
    expect(mermaid.split('\n').filter((line) => line.includes('linkStyle')))
      .toEqual(['  linkStyle 4 stroke:#7c3aed,stroke-width:3px;']);
    expect(mermaid).not.toContain('subgraph');
  });

  it.each(['Q', 'A'])('only highlights follow-ups of a settled %s node', (type) => {
    const nodes = parseDeliberation([
      '- Root [settled]',
      ...['[open]', '[rejected]', '', '[settled]'].flatMap((status) => [
        `  - ${type}: Parent ${status}`,
        '    - Q: Follow-up? [open]',
      ]),
    ].join('\n'));
    const mermaid = renderDeliberationMermaid(nodes);
    const edges = mermaid.split('\n').filter((line) => line.includes(' --> '));
    expect(edges).toHaveLength(8);
    expect(edges[7]).toBe('  n8 --> n9');
    expect(mermaid.split('\n').filter((line) => line.includes('linkStyle')))
      .toEqual(['  linkStyle 7 stroke:#7c3aed,stroke-width:3px;']);
  });

  it('leaves a flat tree with no unlock styling', () => {
    const mermaid = renderDeliberationMermaid(parseDeliberation(BODY));
    expect(mermaid).not.toContain('linkStyle');
    expect(mermaid).not.toContain('subgraph');
  });
});

describe('renderers', () => {
  it('text shows types, states, reason, and override', () => {
    const text = renderDeliberationText(parseDeliberation(BODY));
    expect(text).toContain('Q: Should a grilling session be a persisted entity? [settled]');
    expect(text).toContain('[rejected]');
    expect(text).toContain('(recommended)');
    expect(text).toContain('\u2014 keep only the distilled ADR');
    expect(text).toContain('(override)');
  });

  it('mermaid uses distinct shapes and classes', () => {
    const mermaid = renderDeliberationMermaid(parseDeliberation(BODY));
    expect(mermaid.startsWith('graph TD')).toBe(true);
    expect(mermaid).toContain('(["');
    expect(mermaid).toContain('{{"');
    expect(mermaid).toContain('classDef override');
    expect(mermaid).toContain(' override;');
  });

  it('html is an offline card tree with the record content', () => {
    const html = renderDeliberationHtml(parseDeliberation(BODY), '7 Test');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('class="card question"');
    expect(html).toContain('Should a grilling session be a persisted entity?');
    expect(html).toContain('Human override');
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).toContain('id="fit"');
    // The toolbar keeps the title, the icon-only Info disclosure, and the
    // trailing Share action: cards carry their own collapse toggles, and the
    // legend, statistics, and zoom controls float over the canvas in the dock.
    const header = html.match(/<header class="viewer-bar">([\s\S]*?)<\/header>/)?.[1];
    expect(header).toContain('<details class="viewer-info"><summary aria-label="View information"');
    expect(header).not.toContain('>Info<');
    // The brand is the way back to the repository, and it opens out of the
    // viewer rather than replacing it.
    expect(header).toContain('<a class="viewer-brand" href="https://github.com/luochang212/adr-kit" target="_blank" rel="noopener noreferrer"');
    expect(header).toContain('>ADR Kit</a>');
    expect(header).toContain('<button id="share" class="js-control" aria-label="Save as image" title="Save as image">');
    expect(header.indexOf('viewer-info')).toBeLessThan(header.indexOf('id="share"'));
    expect(header).not.toContain('id="all"');
    expect(header).not.toContain('Expand all options');
    expect(header).toContain('id="instructions"');
    expect(header).not.toContain('id="fit"');
    // The share action renders a branded PNG entirely on the client, crediting
    // the repository by logo and handle.
    expect(html).toContain('luochang212/adr-kit');
    const dock = html.match(/<div class="canvas-dock">([\s\S]*?)<\/main>/)?.[1];
    expect(dock).toContain('class="legend"');
    // The fixture's questions all hang off the root card, so no edge is an
    // unlocked one and the legend draws no key for it.
    expect(dock).toContain('✓ Selected answer');
    expect(dock).not.toContain('Unlocked question');
    expect(dock).toContain('id="fit"');
    expect(html).not.toContain('<section class="intro">');
    expect(html).not.toContain('<footer>');
    expect(html.match(/id="fit"/g)).toHaveLength(1);
    expect(html.match(/id="instructions"/g)).toHaveLength(1);

    expect(html).toContain('7 Test');
    expect(html).toContain('<div class="legend">');
  });

  it('wraps long graph labels without losing words or reasons', () => {
    const text = 'A sufficiently long question about where the deliberation tree should live';
    const reason = 'Keep the complete decision readable';
    const nodes = parseDeliberation(`- Q: ${text} [settled] — ${reason}`);
    const mermaid = renderDeliberationMermaid(nodes);
    const label = mermaid.split('\n')[1]!.match(/\{\{"(.*)"\}\}/)![1]!;
    expect(label).toContain('<br/>');
    expect(label.replaceAll('<br/>', ' ')).toBe(`${text} — ${reason}`);
    expect(renderDeliberationText(nodes)).toContain(text);
    expect(renderDeliberationHtml(nodes, 'Test')).toContain(text);
  });

  it('wraps a label that has no spaces instead of overflowing', () => {
    const text = '一个非常长的中文问题用来检查标签是否会在没有空格的地方换行';
    const nodes = parseDeliberation(`- Q: ${text} [settled]`);
    const mermaid = renderDeliberationMermaid(nodes);
    const label = mermaid.split('\n')[1]!.match(/\{\{"(.*)"\}\}/)![1]!;
    expect(label).toContain('<br/>');
    expect(label.replaceAll('<br/>', '')).toBe(text);
  });
});

describe('offline card tree', () => {
  it('preserves option-dependent and question-dependent anchors separately', () => {
    const nodes = parseDeliberation([
      '- Q: Storage? [settled]',
      '  - A: Local [settled] (recommended)',
      '    - Q: Which directory? [open]',
      '      - A: Workspace [open]',
      '  - Q: How to migrate? [open]',
    ].join('\n'));
    const html = renderDeliberationHtml(nodes, 'Storage');
    expect(html).toContain('id="n2" class="answer" data-state="settled"');
    expect(html).toContain('data-parent="n1" data-anchor="n2" data-state="open"');
    expect(html).toContain('data-parent="n1" data-anchor="" data-state="open"');
    expect(html).toContain('class="state open">open</span>');
    expect(html).toContain('Workspace');
  });

  it('retains rejected branches and standalone or inferred nodes across multiple roots', () => {
    const nodes = parseDeliberation([
      '- Root one',
      '  - Question with inferred type [open]',
      '    - A: Rejected choice [rejected] (recommended) — Cost',
      '      - Q: Follow-up of rejected choice [open]',
      '- A: Standalone option [rejected] — Evidence',
      '- Root two',
    ].join('\n'));
    const html = renderDeliberationHtml(nodes, 'Mixed tree');
    expect(html.match(/class="card root"/g)).toHaveLength(2);
    expect(html).toContain('class="card option"');
    expect(html).toContain('class="state unrecorded">unrecorded</span>');
    expect(html).toContain('Follow-up of rejected choice');
    expect(html).toContain('Agent recommended');
    expect(html).toContain('Cost');
    expect(html).toContain('Evidence');
  });

  it('does not count a settled follow-up as an overridden answer in any renderer', () => {
    const nodes = parseDeliberation([
      '- Q: Undecided [open]',
      '  - A: Recommended [open] (recommended)',
      '  - Q: Related question [settled]',
    ].join('\n'));
    expect(renderDeliberationText(nodes)).not.toContain('(override)');
    expect(renderDeliberationMermaid(nodes)).not.toContain('class n1 override');
    const html = renderDeliberationHtml(nodes, 'Open');
    expect(html).not.toContain('Human override · recommendation not taken');
  });

  it('splits a reason on the first em dash separator', () => {
    expect(parseDeliberation('- A: Use Postgres [rejected] — proven at scale — and cheap')).toEqual([{
      text: 'Use Postgres',
      type: 'option',
      status: 'rejected',
      reason: 'proven at scale — and cheap',
      children: [],
    }]);
  });

  it('leaves a bracketed state word inside prose as text', () => {
    expect(parseDeliberation('- Note: the [open] state is documented')).toEqual([{
      text: 'Note: the [open] state is documented',
      children: [],
    }]);
  });

  it('omits the dependency legend key when only frontier edges are drawn', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - A: Chosen [settled] (recommended)',
      '    - Q: Raised by the root option? [open]',
    ].join('\n')), 'Frontier only');
    expect(html).toContain('data-share-selector="#edges path[data-unlocked=true]"');
    expect(html).not.toContain('data-share-selector="#edges path[data-unlocked=false]"');
  });

  it('groups multiple roots under one label-only virtual card', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root one [settled]',
      '  - Q: Nested? [open]',
      '    - A: Yes [open]',
      '- Root two [settled]',
    ].join('\n')), 'Two roots');
    expect(html).toContain('class="card virtual"');
    expect(html.match(/data-parent="n1"/g)).toHaveLength(2);
    // The synthetic card carries only its label: no heading, no count.
    const virtualCard = html.match(/<article id="n1"[^>]*>[\s\S]*?<\/article>/)![0];
    expect(virtualCard).toContain('DELIBERATION');
    expect(virtualCard).not.toContain('<h2');
    expect(virtualCard).toContain('aria-label="Toggle all decisions"');
  });

  it('keeps a single root as the tree root without a virtual card', () => {
    const html = renderDeliberationHtml(parseDeliberation('- Only root [settled]'), 'One root');
    expect(html).not.toContain('class="card virtual"');
    expect(html).not.toContain('>DELIBERATION<');
    expect(html).toContain('class="card root"');
  });

  it('chips a state only when it is an exception to settled', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root topic [settled]',
      '  - Q: Which directory? [open]',
      '    - A: Workspace [open]',
      '    - A: Home [rejected] — collides with other tools',
      '  - Q: All settled here? [settled]',
      '    - A: Yes [settled] (recommended)',
    ].join('\n')), 'Exceptions');
    // A settled card says nothing: the chosen answer already reads it as settled.
    const labels = html.match(/<div class="label">[\s\S]*?<\/div>/g)!;
    expect(labels[0]).toBe('<div class="label"><span>ROOT</span></div>');
    expect(labels[1]).toContain('<span class="state open">open</span>');
    expect(labels[2]).toBe('<div class="label"><span>QUESTION 02</span></div>');
    expect(html).not.toContain('class="state settled"');
    // The state still travels on the card, where the layout script reads it.
    expect(html).toContain('data-state="settled"');
  });

  it('keys a legend entry only for a chip the tree draws', () => {
    const legendOf = (body: string): string => renderDeliberationHtml(parseDeliberation(body), 'Legend')
      .match(/<div class="legend">([\s\S]*?)<\/div>/)![1]!;
    const overridden = legendOf([
      '- Root [settled]',
      '  - Q: Which directory? [open]',
      '    - A: Workspace [open] (recommended)',
      '    - A: Home [settled]',
    ].join('\n'));
    expect(overridden).toContain('● Human override');
    expect(overridden).toContain('<span class="state open">open</span>unresolved');
    expect(overridden).not.toContain('not taken');
    expect(overridden).not.toContain('no state marker');
    const plain = legendOf([
      '- Root [settled]',
      '  - Q: Which directory? [settled]',
      '    - A: Workspace [settled] (recommended)',
      '    - A: Home [rejected] — collides with other tools',
    ].join('\n'));
    // No override and no open card: the legend must not send the reader looking
    // for either one. A folded option's `rejected` is plain text, not a chip, so
    // it earns no key either.
    expect(plain).not.toContain('Human override');
    expect(plain).not.toContain('unresolved');
    expect(plain).not.toContain('not taken');
    expect(plain).not.toContain('class="state rejected"');
    expect(plain).toContain('✓ Selected answer');
  });

  it('keeps the option states as plain text, not as chips', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - Q: Which directory? [settled]',
      '    - A: Workspace [settled] (recommended)',
      '    - A: Home [rejected] — collides with other tools',
    ].join('\n')), 'Folded');
    const folded = html.match(/<details class="alts">[\s\S]*?<\/details>/)![0];
    expect(folded).toContain('<span class="badge">rejected');
    expect(folded).toContain('data-state="rejected"');
    expect(folded).not.toContain('class="state rejected"');
  });

  it('sources the unlock edge from the option, even when the option sits on the root card', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - A: Chosen [settled] (recommended)',
      '    - Q: Raised by the root option? [open]',
    ].join('\n')), 'Root option');
    // The follow-up hangs off the option (anchor n2) inside the root card, so
    // the unlock rule must ask about the source node, not about the card it is
    // drawn from: the option is settled and is not the root node, so this edge
    // is an unlocked one. The card carries the answer the drawn edge reads, and
    // the legend keys it because the picture has it.
    expect(html).toContain('data-parent="n1" data-anchor="n2"');
    expect(html).toContain('data-anchor="n2" data-state="open" data-unlocked="true"');
    expect(html).toContain("dataset.unlocked === 'true'");
    expect(html).toContain('Unlocked question');
  });

  it('draws no legend panel when the picture has nothing to key', () => {
    const html = renderDeliberationHtml(parseDeliberation('- One statement [settled]'), 'One statement');
    // A lone settled statement draws no edge, settles no answer, raises no
    // follow-up, overrides no recommendation, and chips no state: every entry
    // the legend could carry is absent, so it draws no panel at all.
    expect(html).not.toContain('class="canvas-legend"');
    expect(html).not.toContain('✓ Selected answer');
    expect(html).not.toContain('Unlocked question');
    expect(html).toContain('id="fit"');
  });

  it('samples the line it names in each edge key', () => {
    const legendOf = (body: string): string => renderDeliberationHtml(parseDeliberation(body), 'Edges')
      .match(/<div class="legend">([\s\S]*?)<\/div>/)![1]!;
    // Plain edges only: the key samples the gray stroke the view draws.
    const plain = legendOf([
      '- Root [settled]',
      '  - Q: Which directory? [settled]',
      '    - A: Workspace [settled] (recommended)',
    ].join('\n'));
    expect(plain).toContain('<i class="edge-key"></i>Raised by');
    expect(plain).not.toContain('Unlocked question');
    // A settled option raising a follow-up adds the green key beside it.
    const unlocked = legendOf([
      '- Root [settled]',
      '  - Q: Which directory? [settled]',
      '    - A: Workspace [settled] (recommended)',
      '      - Q: Which subdirectory? [settled]',
      '        - A: Docs [settled]',
    ].join('\n'));
    expect(unlocked).toContain('<i class="edge-key"></i>Raised by');
    expect(unlocked).toContain('<i class="edge-key unlocked"></i>Unlocked question');
  });

  it('lists a statistic only when its count is non-zero', () => {
    const stats = (html: string): string => html.match(/<div class="viewer-stats">([\s\S]*?)<\/div>/)![1]!;
    const undecided = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - Q: Which directory? [settled]',
      '    - A: Workspace [settled] (recommended)',
    ].join('\n')), 'No override');
    // The tree has questions and options but no override, so the Info panel
    // counts those two and stays quiet about the third.
    expect(stats(undecided)).toContain('<strong>1</strong>questions');
    expect(stats(undecided)).toContain('<strong>1</strong>options');
    expect(stats(undecided)).not.toContain('overrides');
  });

  it('keeps root-card answers readable instead of inheriting the root white', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - A: Chosen [settled] (recommended)',
      '  - A: Declined [rejected] — Cost',
    ].join('\n')), 'Root answers');
    const style = html.match(/<style>([\s\S]*?)<\/style>/)![1]!;
    // The answer box keeps its own light background, so an inherited root
    // white would print the chosen text invisibly on it.
    expect(style.match(/\.answer \{[^}]*\}/)![0]).toContain('color: #264c38');
    // Alternatives keep the dark card behind them and need their own
    // light-on-dark colors rather than the light-card grays.
    expect(style).toContain('.root .alts');
    expect(style).toContain('.root .alt .badge');
  });

  it('pans from cards and keeps selection off the canvas', () => {
    const html = renderDeliberationHtml(parseDeliberation('- Root [settled]'), 'Drag');
    // The pan gesture starts anywhere except real controls: on pointer capture
    // their click would land on the viewport and never reach them.
    expect(html).toContain(
      "closest('button, summary, input, select, textarea, .controls, .canvas-legend')",
    );
    expect(html).not.toContain("'.card, .node, .controls");
    // A press that moves pans, a press that stays clicks: the slop threshold
    // keeps clickable content alive inside the canvas, and a pan must not
    // also fire the click it started on.
    expect(html).toContain('CLICK_SLOP');
    expect(html).toContain("if (drag) event.preventDefault()");
    // The shared controller fits the initial view: the map has no layout step
    // of its own, so it would otherwise open at 1:1 with its lower half cut off.
    // It fits the width rather than shrinking to a thumbnail, and Fit stays the
    // whole-diagram overview.
    expect(html).toMatch(/relayout\(\);\s*fitWidth\(\);/);
    expect(html).toContain('function fitWidth()');
    expect(html).toMatch(/window\.addEventListener\('resize', \(\) => \{ relayout\(\); fitWidth\(\); \}\)/);
    // Toolbar icons are block from the shared shell: an inline SVG carries the
    // font's descender space below it, which lifts it out of line with the
    // icon beside it (the map's own stylesheet hid this for a while).
    expect(html).toContain('.viewer-bar button svg, .viewer-bar summary svg { display: block; }');
    // The icon buttons are square and close together as one cluster: 7px of
    // padding on all sides of a 16px icon, 4px apart, 10px from the count.
    expect(html).toContain('<div class="viewer-tools">');
    expect(html).toContain('.viewer-tools { display: flex; align-items: center; gap: 4px; }');
    expect(html).toMatch(/\.viewer-bar button, \.viewer-info > summary \{[^}]*padding: 7px;/);
    // Canvas text cannot be selected: dragging is a pan, and the record file
    // stays the place to copy from.
    expect(html).toMatch(/\.interactive main \{[^}]*user-select: none/);
  });

  it('escapes record text and titles without putting user content into scripts', () => {
    const payload = '</script><script>globalThis.injected = true</script><img src=x onerror=alert(1)>';
    const html = renderDeliberationHtml(parseDeliberation(`- Q: ${payload} [open] — <b>reason</b>`), payload);
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;reason&lt;/b&gt;');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html.match(/<script>([\s\S]*?)<\/script>/)![1]).not.toContain('globalThis.injected');
  });
});

describe('treeCommand', () => {
  function writeRecord(root: string, deliberation: string): void {
    writeFileSync(
      join(folderPath(root, 'implemented'), '1-use-sqlite.md'),
      [
        '---',
        'status: implemented',
        'date: 2026-08-19',
        'raised-by: human',
        'decided-by: human',
        'created: 2026-08-19',
        '---',
        '',
        '# ADR: 1 Use SQLite',
        '',
        '## Problem',
        'Body.',
        '',
        '## Decision',
        'Body.',
        '',
        '## Alternatives considered',
        '- **JSON**: rejected.',
        '',
        '## Consequences',
        'Body.',
        '',
        '## Deliberation',
        '',
        deliberation,
      ].join('\n'),
    );
  }

  it('renders text, mermaid, and html for a record with a tree', () => {
    const root = makeRepo();
    writeRecord(root, BODY);
    expect(treeCommand('1', root, 'text')).toContain('Q: Should a grilling session');
    expect(treeCommand('1', root, 'mermaid')).toContain('graph TD');
    expect(treeCommand('1', root, 'html')).toContain('<!doctype html>');
    expect(treeCommand('1', root, 'html')).toContain('<h1>1 Use SQLite</h1>');
  });

  it('fails clearly when the record has no tree', () => {
    const root = makeRepo();
    writeRecord(root, 'no bullet list here');
    expect(() => treeCommand('1', root, 'text')).toThrow('has no "## Deliberation" tree');
  });
});
