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
    const [rejected, accepted] = question.children;
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.reason).toBe('keep only the distilled ADR');
    expect(accepted!.status).toBe('settled');
    expect(accepted!.recommended).toBe(true);
  });

  it('infers type when the marker is omitted', () => {
    const nodes = parseDeliberation('- root [settled]\n  - parent [settled]\n    - leaf [rejected]');
    const text = renderDeliberationText(nodes);
    expect(text).toContain('Q: parent');
    expect(text).toContain('A: leaf');
  });

  it('treats an unknown parenthetical as text, not syntax', () => {
    // ADR 6's `(round N)` marker is gone from the grammar; nothing reads it.
    const nodes = parseDeliberation('- Q: Where? [settled] (round 2) (recommended) — Keep it local');
    expect(nodes).toEqual([{
      text: 'Where?  (round 2)', type: 'question', status: 'settled',
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
    expect(html).toContain('7 Test');
    expect(html).toContain('<div class="legend">');
    expect(html).toContain('Unlocked question');
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

  it('does not count a settled follow-up as an overridden answer', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Q: Undecided [open]',
      '  - A: Recommended [open] (recommended)',
      '  - Q: Related question [settled]',
    ].join('\n')), 'Open');
    expect(html).not.toContain('Human override · recommendation not taken');
  });

  it('sources the unlock edge from the option, even when the option sits on the root card', () => {
    const html = renderDeliberationHtml(parseDeliberation([
      '- Root [settled]',
      '  - A: Chosen [settled] (recommended)',
      '    - Q: Raised by the root option? [open]',
    ].join('\n')), 'Root option');
    // The follow-up hangs off the option (anchor n2) inside the root card, so
    // the unlock rule must ask about the source node, not about the card it is
    // drawn from. Mermaid asks the same question of the immediate parent node.
    expect(html).toContain('data-parent="n1" data-anchor="n2"');
    expect(html).toContain("!item.anchor && parent.card.classList.contains('root')");
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
      join(folderPath(root, 'decisions'), '1-use-sqlite.md'),
      [
        '---',
        'status: accepted',
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
