import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parseAdrFile, type AdrSection } from '../src/core/adr.js';

function write(relative: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-adr-'));
  const path = join(dir, relative);
  writeFileSync(path, content);
  return path;
}

/** Test-only renderer mirroring the canonical header order. */
function renderAdr(options: {
  title: string;
  status: string;
  sections: AdrSection[];
}): string {
  const lines: string[] = [`# ADR: ${options.title}`, `Status: ${options.status}`, ''];
  for (const section of options.sections) {
    lines.push(`## ${section.heading}`, '');
    if (section.body.trim().length > 0) {
      lines.push(section.body.replace(/\n+$/, ''), '');
    } else {
      lines.push('', '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

const VALID = `# ADR: Use SQLite
Status: proposed

## Problem

Body.

## Proposal

Body.

## Alternatives considered

- **JSON**: no queries.

## Acceptance criteria

Body.

## Risks

Body.
`;

describe('parseAdrFile', () => {
  it('parses a valid record', () => {
    const record = parseAdrFile(write('record.md', VALID));
    expect(record.title).toBe('Use SQLite');
    expect(record.status).toBe('proposed');
    expect(record.sections.find((s) => s.heading === 'Problem')?.body).toContain('Body.');
  });

  it('rejects a missing status line', () => {
    const path = write('record.md', '# ADR: Title\n\nStatus: proposed\n');
    expect(() => parseAdrFile(path)).toThrow(/second line/);
  });

  it('parses accepted decision numbers', () => {
    const record = parseAdrFile(write('record.md', `# ADR: 4 Use SQLite
Status: accepted

## Problem

Body.

## Decision

Body.

## Alternatives considered

Body.

## Consequences

Body.
`));
    expect(record.number).toBe(4);
  });

  it('does not treat a zero-padded title number as a decision number', () => {
    const record = parseAdrFile(write('record.md', `# ADR: 0004 Use SQLite
Status: accepted

## Problem

Body.

## Decision

Body.

## Alternatives considered

Body.

## Consequences

Body.
`));
    expect(record.number).toBeUndefined();
  });

  it('rejects a zero-padded supersede reference', () => {
    expect(() =>
      parseAdrFile(write('record.md', `# ADR: 1 Use SQLite
Status: superseded by 0001

## Problem

Body.
`)),
    ).toThrow(/status must be/);
  });
});

describe('renderAdr', () => {
  it('renders the canonical header order', () => {
    const text = renderAdr({
      title: 'Use SQLite',
      status: 'proposed',
      sections: [{ heading: 'Problem', body: 'Body.\n' }],
    });
    expect(text.startsWith('# ADR: Use SQLite\nStatus: proposed\n\n## Problem')).toBe(true);
  });
});
