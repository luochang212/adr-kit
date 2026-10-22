import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { validateCommand } from '../src/commands/validate.js';
import { findCitations } from '../src/core/markers.js';
import { folderPath } from '../src/core/repository.js';
import { validateRepository } from '../src/core/validate.js';

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-markers-'));
  tempDirs.push(dir);
  initCommand(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Fixture citations are assembled from parts on purpose: this test file is
 * scanned by the very check it exercises, so a literal citation here would
 * make the repository's own validation fail on its fixtures.
 */
function cite(numbers: string | number, sigil = 'adr'): string {
  return `@${sigil} ${numbers}`;
}

const ACCEPTED = { status: 'implemented', date: '2026-08-19' };

function decision(title: string, fields: Record<string, string | number>): string {
  const entries: Array<[string, string | number]> = [];
  for (const [key, value] of Object.entries(fields)) {
    entries.push([key, value]);
    if (key === 'date') {
      if (!('raised-by' in fields)) entries.push(['raised-by', 'human']);
      if (!('decided-by' in fields)) entries.push(['decided-by', 'human']);
      if (!('created' in fields)) entries.push(['created', value]);
    }
  }
  const frontMatter = entries.map(([key, value]) => `${key}: ${value}`).join('\n');
  return `---
${frontMatter}
---

# ADR: ${title}

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

function supersededDecision(title: string, successor: number): string {
  return decision(title, {
    status: 'superseded',
    date: '2026-08-19',
    'superseded-by': successor,
    archived: '2026-08-19',
    'archive-reason': `superseded by ADR ${successor}`,
  });
}

function writeRecord(root: string, folder: 'implemented' | 'archived', fileName: string, content: string): void {
  writeFileSync(join(folderPath(root, folder), fileName), content);
}

function writeSource(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function citationMessages(root: string): string[] {
  return validateRepository(root)
    .filter((issue) => issue.message.includes('cites ADR'))
    .map((issue) => `${issue.path}: ${issue.message}`);
}

describe('citation syntax', () => {
  it('reads one or several decision numbers and keeps their line', () => {
    const text = `// ${cite('14')} and ${cite('2, 3')}\nno citation here\n// ${cite(99)}`;
    expect(findCitations(text)).toEqual([
      { line: 1, numbers: [14, 2, 3] },
      { line: 3, numbers: [99] },
    ]);
  });

  it('accepts mixed case and ignores near misses', () => {
    expect(findCitations(`// ${cite(7, 'ADR')}`)).toEqual([{ line: 1, numbers: [7] }]);
    expect(findCitations('@adrkit is not a citation')).toEqual([]);
    expect(findCitations(cite('N'))).toEqual([]);
    expect(findCitations(cite('14abc'))).toEqual([]);
    // Zero is not a decision number, but it is still a citation worth rejecting.
    expect(findCitations(cite(0))).toEqual([{ line: 1, numbers: [0] }]);
  });
});

describe('citation validation', () => {
  it('accepts a live decision the citing file is in scope for', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '1-live.md',
      decision('1 Live', { ...ACCEPTED, paths: '[src/**]' }));
    writeSource(root, 'src/a.ts', `${cite(1)}\nexport const a = 1;\n`);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('fails a citation to a superseded decision and names the successor', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '2-live.md', decision('2 Live', ACCEPTED));
    writeRecord(root, 'archived', '1-old.md', supersededDecision('1 Old', 2));
    writeSource(root, 'src/a.ts', `${cite(1)}\n`);
    const messages = citationMessages(root);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('line 1: cites ADR 1, which was superseded by ADR 2');
  });

  it('fails a citation to a retired decision', () => {
    const root = makeRepo();
    writeRecord(root, 'archived', '1-retired.md', decision('1 Retired', {
      ...ACCEPTED,
      archived: '2026-08-19',
      'archive-reason': 'no longer guides future work',
    }));
    writeSource(root, 'src/a.ts', `${cite(1)}\n`);
    expect(citationMessages(root)).toEqual([
      expect.stringContaining('cites ADR 1, which is archived'),
    ]);
  });

  it('fails a citation to a number that does not exist', () => {
    const root = makeRepo();
    writeSource(root, 'src/a.ts', `${cite(99)}\n`);
    expect(citationMessages(root)).toEqual([
      expect.stringContaining('line 1: cites ADR 99, which does not exist'),
    ]);
  });

  it('fails a citation from outside the decision paths', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'src', 'core'), { recursive: true });
    writeRecord(root, 'implemented', '1-live.md',
      decision('1 Live', { ...ACCEPTED, paths: '[src/core/**]' }));
    writeSource(root, 'src/a.ts', `${cite(1)}\n`);
    expect(citationMessages(root)).toEqual([
      expect.stringContaining('cites ADR 1, but the file is outside its paths (src/core/**)'),
    ]);
  });

  it('accepts a citation to a live decision with no paths', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '1-live.md', decision('1 Live', ACCEPTED));
    writeSource(root, 'src/a.ts', `${cite(1)}\n`);
    expect(citationMessages(root)).toEqual([]);
  });

  it('reports only the stale number in a mixed citation', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '1-live.md', decision('1 Live', ACCEPTED));
    writeSource(root, 'src/a.ts', `${cite('1, 99')}\n`);
    expect(citationMessages(root)).toEqual([
      expect.stringContaining('cites ADR 99, which does not exist'),
    ]);
  });

  it('does not read prose, binary files, or the adr directory', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '1-live.md', decision('1 Live', ACCEPTED));
    writeSource(root, 'README.md', `Example: ${cite(99)}\n`);
    writeSource(root, 'src/blob.ts', `${cite(99)}\n\0`);
    writeSource(root, 'adr/snippet.ts', `${cite(99)}\n`);
    expect(citationMessages(root)).toEqual([]);
  });

  it('skips dependency trees and the published site copy', () => {
    const root = makeRepo();
    writeSource(root, 'vendor/pkg/a.ts', `${cite(99)}\n`);
    writeSource(root, '.venv/lib/a.py', `${cite(99)}\n`);
    writeSource(root, 'Pods/Library/a.swift', `${cite(99)}\n`);
    writeSource(root, 'site/src/i18n/ui.ts', `${cite(99)}\n`);
    expect(citationMessages(root)).toEqual([]);
  });

  it('rejects a zero citation instead of dropping it', () => {
    const root = makeRepo();
    writeSource(root, 'src/a.ts', `${cite(0)}\n`);
    expect(citationMessages(root)).toEqual([
      expect.stringContaining('cites ADR 0, which does not exist'),
    ]);
  });

  it('keeps the repository-wide scan out of single-record validation', () => {
    const root = makeRepo();
    writeRecord(root, 'implemented', '1-live.md', decision('1 Live', ACCEPTED));
    writeSource(root, 'src/a.ts', `${cite(99)}\n`);
    expect(validateCommand(root, '1').valid).toBe(true);
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    // Reports speak the repository's forward-slash convention on every platform.
    expect(result.output).toContain('src/a.ts: line 1: cites ADR 99, which does not exist');
  });

  it('this repository keeps its own citations live', () => {
    // A rotted citation fails validation, but a deleted one fails nothing:
    // the ADR 19 citation in retire.ts vanished when ADR 30 superseded that
    // record, and with it ADR 26's claim that the repository dogfoods the
    // convention. Pin the set that keeps the gate exercised here.
    const root = fileURLToPath(new URL('..', import.meta.url));
    const expected: Array<[string, number[]]> = [
      ['src/core/retire.ts', [30]],
      ['src/core/graph-html.ts', [9, 11]],
      ['src/core/decision-atlas.ts', [29, 31]],
      ['src/core/markers.ts', [26]],
    ];
    for (const [file, numbers] of expected) {
      const cited = findCitations(readFileSync(join(root, file), 'utf8')).flatMap((entry) => entry.numbers);
      for (const number of numbers) {
        expect(cited, `${file} should cite ADR ${number}`).toContain(number);
      }
    }
  });
});
