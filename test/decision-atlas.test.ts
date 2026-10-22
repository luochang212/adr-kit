import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AdrRecord } from '../src/core/adr.js';
import { ATLAS_SLOTS, renderDecisionAtlas } from '../src/core/decision-atlas.js';
import { buildDecisionGraph } from '../src/core/graph.js';

const template = `<!doctype html><html><head>
<!-- atlas:title --><title>old</title><!-- /atlas:title -->
</head><body>
<!-- atlas:hero --><section>old hero</section><!-- /atlas:hero -->
<!-- atlas:stats --><section>old stats</section><!-- /atlas:stats -->
<!-- atlas:density-note --><p>old</p><!-- /atlas:density-note -->
<!-- atlas:inbound-note --><p>old</p><!-- /atlas:inbound-note -->
<!-- atlas:replacements-note --><p>old</p><!-- /atlas:replacements-note -->
<main><!-- atlas:map --><svg></svg><!-- /atlas:map --></main>
<!-- atlas:footer --><footer>old</footer><!-- /atlas:footer -->
<script>/* atlas:records */
const records = [];
/* /atlas:records */</script>
</body></html>`;

function record(
  overrides: Partial<AdrRecord> & { number: number; title: string; folder: 'implemented' | 'archived' },
): AdrRecord {
  const folder = overrides.folder ?? 'implemented';
  const { number } = overrides;
  return {
    path: `adr/${folder}/${number}-slug.md`,
    fileName: `${number}-slug.md`,
    status: folder === 'archived' ? 'superseded' : 'implemented',
    date: '2026-10-01',
    created: '2026-10-01',
    sections: [
      { heading: 'Problem', body: '\nA problem.\n' },
      { heading: 'Decision', body: '\nA decision.\n' },
    ],
    ...overrides,
    folder,
  } as AdrRecord;
}

function render(records: AdrRecord[], page = template, language?: 'en' | 'zh'): string {
  return renderDecisionAtlas({
    template: page,
    records,
    graph: buildDecisionGraph(records),
    commit: 'abc1234',
    repositoryUrl: 'https://github.com/example/repo/',
    projectName: 'Example',
    language,
  });
}

function recordsFrom(page: string): unknown[] {
  const open = '/* atlas:records */';
  const close = '/* /atlas:records */';
  const slot = page.slice(page.indexOf(open) + open.length, page.indexOf(close)).trim();
  expect(slot.startsWith('const records = ')).toBe(true);
  return JSON.parse(slot.slice('const records = '.length, -1));
}

const live = [
  record({
    number: 1,
    title: 'Choose <SQLite> & sessions',
    created: '2026-10-01',
    tags: ['storage'],
    paths: ['src/storage.ts'],
    sections: [{ heading: 'Problem', body: '\nSessions leaked.\n' }, { heading: 'Decision', body: '\nUse SQLite.\n' }],
    commit: 'def5678',
  }),
  record({
    number: 2,
    title: 'Scope the session store',
    created: '2026-10-01',
    tags: ['storage'],
    sections: [{ heading: 'Problem', body: '\nADR-1 needed a boundary.\n' }, { heading: 'Decision', body: '\nOne store.\n' }],
  }),
  record({
    number: 3,
    title: 'One database per tenant',
    folder: 'archived',
    created: '2026-10-02',
    supersededBy: 1,
    archiveReason: 'Single-tenant deployment shipped',
    sections: [{ heading: 'Problem', body: '\nSECRET ARCHIVE BODY\n' }],
  }),
];

describe('decision atlas rendering', () => {
  it('replaces every slot with data from the current records', () => {
    const page = render(live);
    expect(page).toContain('<title>Example · 决策档案</title>');
    expect(page).toContain('<h1>Example</h1>');
    expect(page).toContain('<strong>2</strong><span>生效决策</span>');
    expect(page).toContain('<strong>1</strong><span>归档历史</span>');
    expect(page).toContain('<strong>1</strong><span>引用关系</span>');
    // The generator's name links to the repository it was built from.
    expect(page).toContain('<a class="footer-repo" href="https://github.com/example/repo"');
    // The atlas draws its own count column, so the date label stays bare.
    expect(page).toContain('>2026-10-01</text>');
    expect(page).toContain('>2 条</text>');
    expect(page).not.toContain('2026-10-01 (2)');
    expect(page).not.toContain('old hero');
    expect(page).not.toContain('old stats');
  });

  it('links map nodes to in-page anchors and pins records to the build commit', () => {
    const page = render(live);
    expect(page).toContain('id="adr-1"');
    expect(page).toContain('href="#adr-1"');
    expect(page).toContain('href="https://github.com/example/repo/tree/abc1234"');
    expect(page).toContain('"source":"https://github.com/example/repo/blob/abc1234/adr/implemented/1-slug.md"');
    expect(recordsFrom(page)).toEqual([
      expect.objectContaining({ number: 1, lifecycle: 'implemented', body: expect.stringContaining('Use SQLite.') }),
      expect.objectContaining({ number: 2, lifecycle: 'implemented' }),
      expect.objectContaining({ number: 3, lifecycle: 'archived', body: expect.stringContaining('SECRET ARCHIVE BODY') }),
    ]);
  });

  it('publishes archived bodies in full while retaining their reason', () => {
    const page = render(live);
    expect(page).toContain('SECRET ARCHIVE BODY');
    expect(page).toContain('Single-tenant deployment shipped');
    expect(recordsFrom(page)[2]).toMatchObject({ 'archive-reason': 'Single-tenant deployment shipped' });
  });

  it('renders the shipped template in English without Chinese chrome', () => {
    const shipped = readFileSync(new URL(
      '../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url,
    ), 'utf8');
    const page = render(live, shipped, 'en');
    expect(page).toContain('Example · Decision atlas');
    expect(page).toContain('Active decisions');
    expect(page).toContain('<html lang="en">');
    // The six chapter tabs stay one word each; their section headings keep the
    // full label.
    for (const tab of ['Density', 'Timeline', 'Relations', 'Map', 'Provenance', 'Records']) {
      expect(page).toContain(`</span>${tab}</a>`);
    }
    expect(page).toContain('Decision density');
    expect(page).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('keeps the shipped template Chinese by default', () => {
    const shipped = readFileSync(new URL(
      '../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url,
    ), 'utf8');
    const page = render(live, shipped);
    expect(page).toContain('Example · 决策档案');
    expect(page).toContain('<html lang="zh-CN">');
  });

  it('keeps the deliberation appendix in the record body', () => {
    const grilled = record({
      number: 1,
      title: 'Grilled decision',
      sections: [
        { heading: 'Problem', body: '\nHard.\n' },
        { heading: 'Decision', body: '\nChosen.\n' },
        { heading: 'Alternatives considered', body: '\nOther.\n' },
        { heading: 'Consequences', body: '\nCost.\n' },
        {
          heading: 'Deliberation',
          body: '\n- Q: Where do sessions live? [settled]\n  - A: SQLite [settled] (recommended)\n',
        },
      ],
    });
    const payload = recordsFrom(render([grilled]))[0] as { body: string };
    // The appendix is part of the record, prose included; the reader renders
    // the whole body and does not replace the section with a special view.
    expect(payload.body).toContain('## Deliberation');
    expect(payload.body).toContain('Where do sessions live?');
  });

  it('escapes record content so titles and script-closing text stay data', () => {
    const attack = [
      record({
        number: 1,
        title: 'Close </script><script>alert(1)</script>',
        sections: [{ heading: 'Problem', body: '\n</script><img src=x onerror=alert(1)>\n' }],
      }),
    ];
    const page = render(attack);
    expect(page).toContain('&lt;/script&gt;');
    expect(page).not.toContain('<script>alert(1)</script>');
    expect(page).toContain('\\u003c/script>');
    expect(recordsFrom(page)).toEqual([
      expect.objectContaining({ title: 'Close </script><script>alert(1)</script>' }),
    ]);
  });

  it('recomputes statistics and prose when records change', () => {
    const first = render(live);
    const second = render(live.slice(0, 1));
    expect(first).toContain('已归档 1 条历史记录');
    expect(second).toContain('还没有归档记录');
    expect(second).toContain('<strong>1</strong><span>生效决策</span>');
    expect(second).toContain('1 条记录都立在 2026-10-01。');
  });

  it('ships the slot markers the site build depends on', () => {
    const shipped = readFileSync(
      new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url),
      'utf8',
    );
    for (const slot of ATLAS_SLOTS) expect(shipped).toContain(`<!-- atlas:${slot} -->`);
    expect(shipped).toContain('/* atlas:records */');
    expect(shipped).toContain('/* /atlas:records */');
  });

  it('fails loudly when the resource loses a slot', () => {
    const broken = template.replace('<!-- atlas:map --><svg></svg><!-- /atlas:map -->', '');
    expect(() => render(live, broken)).toThrow(/missing the map slot/);
  });
});
