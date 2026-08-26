import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { FRONT_MATTER_ORDER, parseAdrFile, type AdrSection } from '../src/core/adr.js';

function write(relative: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-adr-'));
  const path = join(dir, relative);
  writeFileSync(path, content);
  return path;
}

/** Test-only renderer mirroring the canonical front matter field order. */
function renderAdr(options: {
  title: string;
  fields: Record<string, string | number>;
  sections: AdrSection[];
}): string {
  const ordered: Record<string, string | number> = {};
  for (const key of FRONT_MATTER_ORDER) {
    const value = options.fields[key];
    if (value !== undefined) ordered[key] = value;
  }
  const lines: string[] = ['---', ...stringify(ordered).trimEnd().split('\n'), '---', '', `# ADR: ${options.title}`, ''];
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

const VALID = `---
status: proposed
date: 2026-08-19
created: 2026-08-19
---

# ADR: Use SQLite

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
    expect(record.date).toBe('2026-08-19');
    expect(record.sections.find((s) => s.heading === 'Problem')?.body).toContain('Body.');
  });

  it('rejects a record without a front matter block', () => {
    const path = write('record.md', '# ADR: Title\nStatus: proposed\nDate: 2026-08-19\n');
    expect(() => parseAdrFile(path)).toThrow(/front matter/);
  });

  it('rejects an unclosed front matter block', () => {
    const path = write('record.md', '---\nstatus: proposed\ndate: 2026-08-19\n\n# ADR: Title\n');
    expect(() => parseAdrFile(path)).toThrow(/not closed/);
  });

  it('rejects invalid YAML in the front matter', () => {
    const path = write('record.md', '---\nstatus: [unclosed\n---\n\n# ADR: Title\n');
    expect(() => parseAdrFile(path)).toThrow(/not valid YAML/);
  });

  it('rejects a missing status field', () => {
    const path = write('record.md', '---\ndate: 2026-08-19\n---\n\n# ADR: Title\n');
    expect(() => parseAdrFile(path)).toThrow(/must include "status"/);
  });

  it('rejects an unknown status', () => {
    const path = write('record.md', '---\nstatus: draft\ndate: 2026-08-19\n---\n\n# ADR: Title\n');
    expect(() => parseAdrFile(path)).toThrow(/status must be/);
  });

  it('rejects a missing date field', () => {
    const path = write('record.md', '---\nstatus: proposed\n---\n\n# ADR: Title\n\n## Problem\n');
    expect(() => parseAdrFile(path)).toThrow(/must include "date"/);
  });

  it('rejects a malformed date field', () => {
    const path = write('record.md', '---\nstatus: proposed\ndate: 19/08/2026\n---\n\n# ADR: Title\n\n## Problem\n');
    expect(() => parseAdrFile(path)).toThrow(/YYYY-MM-DD/);
  });

  it('rejects a rejected record without a reason', () => {
    const path = write('record.md', '---\nstatus: rejected\ndate: 2026-08-19\n---\n\n# ADR: Title\n');
    expect(() => parseAdrFile(path)).toThrow(/requires a non-empty "reason"/);
  });

  it('rejects a reason on a non-rejected record', () => {
    const path = write(
      'record.md',
      '---\nstatus: proposed\ndate: 2026-08-19\nreason: not allowed\n---\n\n# ADR: Title\n',
    );
    expect(() => parseAdrFile(path)).toThrow(/"reason" is only allowed/);
  });

  it('rejects a superseded record without a positive integer superseded-by', () => {
    const path = write('record.md', '---\nstatus: superseded\ndate: 2026-08-19\nsuperseded-by: 0\n---\n\n# ADR: 1 Title\n');
    expect(() => parseAdrFile(path)).toThrow(/superseded-by/);
  });

  it('rejects superseded-by on a non-superseded record', () => {
    const path = write(
      'record.md',
      '---\nstatus: accepted\ndate: 2026-08-19\nsuperseded-by: 2\n---\n\n# ADR: 1 Title\n',
    );
    expect(() => parseAdrFile(path)).toThrow(/"superseded-by" is only allowed/);
  });

  it('collects unknown front matter keys for validate to report', () => {
    const path = write(
      'record.md',
      '---\nstatus: proposed\ndate: 2026-08-19\nowner: platform\n---\n\n# ADR: Title\n\n## Problem\n\nBody.\n',
    );
    const record = parseAdrFile(path);
    expect(record.frontMatterExtras).toEqual(['owner']);
  });

  it('parses a rejected record with a reason', () => {
    const record = parseAdrFile(
      write('record.md', '---\nstatus: rejected\ndate: 2026-08-19\nreason: we prefer files\n---\n\n# ADR: Title\n\n## Problem\n\nBody.\n'),
    );
    expect(record.status).toBe('rejected');
    expect(record.rejectionReason).toBe('we prefer files');
  });

  it('parses a superseded record', () => {
    const record = parseAdrFile(
      write('record.md', '---\nstatus: superseded\ndate: 2026-08-19\nsuperseded-by: 2\n---\n\n# ADR: 1 Title\n\n## Problem\n\nBody.\n'),
    );
    expect(record.status).toBe('superseded');
    expect(record.supersededBy).toBe(2);
  });

  it('parses accepted decision numbers', () => {
    const record = parseAdrFile(write('record.md', `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 4 Use SQLite

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
    const record = parseAdrFile(write('record.md', `---
status: accepted
date: 2026-08-19
created: 2026-08-19
---

# ADR: 0004 Use SQLite

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
});

describe('created and tags', () => {
  it('parses created and tags from the front matter', () => {
    const record = parseAdrFile(
      write(
        '1-x.md',
        renderAdr({
          title: '1 Use SQLite',
          fields: {
            status: 'accepted',
            date: '2026-08-19',
            created: '2026-08-17',
            tags: ['execution-layer', 'sandbox'],
          },
          sections: [{ heading: 'Problem', body: 'Body.\n' }],
        }),
      ),
    );
    expect(record.created).toBe('2026-08-17');
    expect(record.tags).toEqual(['execution-layer', 'sandbox']);
  });

  it('rejects a malformed created field', () => {
    expect(() =>
      parseAdrFile(
        write(
          '1-x.md',
          renderAdr({
            title: '1 Use SQLite',
            fields: { status: 'accepted', date: '2026-08-19', created: 'not-a-date' },
            sections: [{ heading: 'Problem', body: 'Body.\n' }],
          }),
        ),
      ),
    ).toThrow(/created must be a "YYYY-MM-DD" string/);
  });

  it('rejects a non-list tags field', () => {
    expect(() =>
      parseAdrFile(
        write(
          '1-x.md',
          renderAdr({
            title: '1 Use SQLite',
            fields: { status: 'accepted', date: '2026-08-19', tags: 'sandbox' },
            sections: [{ heading: 'Problem', body: 'Body.\n' }],
          }),
        ),
      ),
    ).toThrow(/tags must be a list of strings/);
  });
});

describe('renderAdr', () => {
  it('renders the canonical front matter field order', () => {
    const text = renderAdr({
      title: 'Use SQLite',
      fields: { date: '2026-08-19', status: 'proposed' },
      sections: [{ heading: 'Problem', body: 'Body.\n' }],
    });
    expect(
      text.startsWith('---\nstatus: proposed\ndate: 2026-08-19\n---\n\n# ADR: Use SQLite\n\n## Problem'),
    ).toBe(true);
  });
});
