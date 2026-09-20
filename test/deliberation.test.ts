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

  it('is empty for an absent or non-list body', () => {
    expect(parseDeliberation(undefined)).toEqual([]);
    expect(parseDeliberation('just prose')).toEqual([]);
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

  it('html is one document with the mermaid source', () => {
    const html = renderDeliberationHtml(parseDeliberation(BODY), '7 Test');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<pre class="mermaid">');
    expect(html).toContain('graph TD');
    expect(html).toContain('7 Test');
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
  });

  it('fails clearly when the record has no tree', () => {
    const root = makeRepo();
    writeRecord(root, 'no bullet list here');
    expect(() => treeCommand('1', root, 'text')).toThrow('has no "## Deliberation" tree');
  });
});
