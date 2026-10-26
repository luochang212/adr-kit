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

function render(records: AdrRecord[], page = template, language?: 'en' | 'zh', theme: 'folio' | 'signal' = 'folio'): string {
  return renderDecisionAtlas({
    template: page,
    records,
    graph: buildDecisionGraph(records),
    commit: 'abc1234',
    repositoryUrl: 'https://github.com/example/repo/',
    projectName: 'Example',
    language,
    theme,
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
    // ADR 33 fixes the tree's term as "deliberation tree"; the label keeps it
    // as written and marks what the count covers.
    expect(page).toContain('<span>deliberation tree</span>');
    // The generator's name links to the tool, while the commit link points at
    // the repository being documented.
    expect(page).toContain('<a class="footer-repo" href="https://github.com/luochang212/adr-kit"');
    expect(page).toContain('href="https://github.com/example/repo/tree/abc1234"');
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
    expect(page).toContain('<html lang="en"');
    // The six chapter tabs stay one word each; their section headings keep the
    // full label.
    for (const tab of ['Density', 'Timeline', 'Relations', 'Map', 'Provenance', 'Records']) {
      expect(page).toContain(`</span>${tab}</a>`);
    }
    expect(page).toContain('Decision density');
    expect(page).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('writes singular English prose instead of plural templates', () => {
    const one = [record({ number: 1, title: 'Only one', created: '2026-10-01' })];
    const page = render(one, template, 'en');
    expect(page).toContain('1 record dates to 2026-10-01.');
    const twoDays = [
      record({ number: 1, title: 'First', created: '2026-10-01' }),
      record({ number: 2, title: 'Second', created: '2026-10-02' }),
    ];
    expect(render(twoDays, template, 'en')).toContain('2 records run from 10-01 to 10-02 across 2 distinct days');
  });

  it('writes a singular replacement note when one archived record has a successor', () => {
    const page = render([live[0]!, record({
      number: 3,
      title: 'One database per tenant',
      folder: 'archived',
      created: '2026-10-02',
      supersededBy: 1,
      archiveReason: 'Single-tenant deployment shipped',
    })], template, 'en');
    expect(page).toContain('1 archived record pointing to its successor');
  });

  it('writes a singular reference count', () => {
    const cited = [
      record({
        number: 1,
        title: 'Cited',
        sections: [{ heading: 'Problem', body: '\nA problem.\n' }, { heading: 'Decision', body: '\nSee ADR-2.\n' }],
      }),
      record({ number: 2, title: 'Citing' }),
    ];
    expect(render(cited, template, 'en')).toContain('is referenced 1 time;');
  });

  it.each(['zh', 'en'] as const)('keeps the %s footer compact with generator and commit provenance', (language) => {
    const page = render(live, template, language);
    const footer = page.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)![0];
    expect(footer).toContain('class="footer-repo"');
    expect(footer).toContain('class="footer-commit"');
    expect(footer).toContain('abc1234');
    expect(footer).not.toContain('footer-home');
    expect(footer).not.toContain('footer-lang');
    expect(footer).not.toContain('from the current records');
    expect(footer).not.toContain('从当前记录生成');
    expect(footer).toContain(language === 'en' ? 'Generated by ' : '由 ');
    expect(footer).toContain(language === 'en' ? 'Pinned at' : '定格于');
  });

  it('keeps the shipped template Chinese by default', () => {
    const shipped = readFileSync(new URL(
      '../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url,
    ), 'utf8');
    const page = render(live, shipped);
    expect(page).toContain('Example · 决策档案');
    expect(page).toContain('<html lang="zh-CN"');
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
    expect(first).toContain('被替代的选择并不消失：1 条记录已归档，每条都指向接棒的继任者');
    expect(second).toContain('还没有归档记录');
    expect(second).toContain('<strong>1</strong><span>生效决策</span>');
    expect(second).toContain('1 条记录都立在 2026-10-01。');
  });

  it('keeps both counts when only some archived records name a successor', () => {
    const partial = [
      live[0]!,
      live[2]!,
      record({
        number: 4,
        title: 'Retired experiment',
        folder: 'archived',
        archiveReason: 'No successor needed',
        sections: [{ heading: 'Problem', body: '\nArchived body.\n' }],
      }),
    ];
    const page = render(partial);
    expect(page).toContain('2 条记录已归档，其中 1 条标注了接棒的继任者');
    expect(render(partial, template, 'en')).toContain('2 archived records, 1 of them naming a successor');
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


it('keeps records and non-hero content identical across named themes', () => {
  const folio = render(live, template, 'en', 'folio');
  const signal = render(live, template, 'en', 'signal');
  expect(recordsFrom(signal)).toEqual(recordsFrom(folio));
  const withoutHero = (html: string) => html.replace(/<!-- atlas:hero -->[\s\S]*?<!-- \/atlas:hero -->/, '').replace(/<!-- atlas:stats -->[\s\S]*?<!-- \/atlas:stats -->/, '');
  expect(withoutHero(signal).replace('data-atlas-theme="signal"', 'data-atlas-theme="folio"')).toBe(withoutHero(folio));
});


it.each(['folio', 'signal'] as const)('enables only the selected %s document styles', theme => {
  const page = readFileSync(new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url), 'utf8');
  const html = render(live, page, 'en', theme);
  expect(html).toContain(`<style data-atlas-style="${theme}">`);
  expect(html).toContain(`<style data-atlas-style="${theme === 'folio' ? 'signal' : 'folio'}" media="not all">`);
  expect(html.includes('class="hero-actions"')).toBe(theme === 'folio');
  const sourceInHeader = /<span id="reader-meta"><\/span><a id="reader-source"/.test(html);
  expect(sourceInHeader).toBe(true);
  expect(html.match(/id="reader-source"/g)).toHaveLength(1);
});

it.each(['en', 'zh'] as const)('preserves Folio’s original content and statistics together in %s', language => {
  const html = render(live, template, language, 'folio');
  const hero = html.split('<!-- atlas:hero -->')[1].split('<!-- /atlas:hero -->')[0];
  expect(hero).toContain('class="hero-actions"');
  expect(hero).toContain('class="stats-band"');
  expect(html.match(/class="stats-band"/g)).toHaveLength(1);
});

it.each(['en', 'zh'] as const)('keeps the existing Folio density section once inside the hero in %s', language => {
  const page = readFileSync(new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url), 'utf8');
  const html = render(live, page, language, 'folio');
  const hero = html.split('<!-- atlas:hero -->')[1].split('<!-- /atlas:hero -->')[0];
  expect(hero).toContain('id="overview-view"');
  expect(hero).toContain('id="density-chart"');
  expect(hero).toContain(language === 'en' ? 'Decision density' : '决策密度');
  expect(html.match(/id="density-chart"/g)).toHaveLength(1);
});

it.each(['en', 'zh'] as const)('keeps Signal’s archive entrance and all statistics inside the hero in %s', language => {
  const html = render(live, template, language, 'signal');
  const hero = html.split('<!-- atlas:hero -->')[1].split('<!-- /atlas:hero -->')[0];
  expect(hero).toContain('class="archive-stack"');
  expect(hero).not.toContain('archive-heading');
  expect(hero).not.toContain('archive-progress');
  expect(hero).not.toContain('archive-reset');
  expect(hero).toContain('class="stats-band"');
  expect(hero).toContain(language === 'en' ? 'Active decisions' : '生效决策');
  expect(hero).toContain(language === 'en' ? 'Archived history' : '归档历史');
  expect(hero).toContain(language === 'en' ? 'References' : '引用关系');
  expect(hero).toContain(language === 'en' ? 'Deliberation trees' : 'deliberation tree');
  expect(hero).not.toContain('hero-baseline');
  expect(hero).not.toContain('↓');
  expect(hero).toContain(language === 'en' ? 'A traceable story.' : '都有迹可循。');
  expect(html.match(/class="stats-band"/g)).toHaveLength(1);
  expect(render([], template, language, 'signal')).toContain('class="archive-stack"');
});


it.each(['en', 'zh'] as const)('shares every runtime script between themes in %s', language => {
  const page = readFileSync(new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url), 'utf8');
  const scripts = (html: string) => [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const folio = render(live, page, language, 'folio');
  const signal = render(live, page, language, 'signal');
  expect(scripts(folio).length).toBeGreaterThan(1);
  expect(scripts(signal)).toEqual(scripts(folio));
  expect(recordsFrom(signal)).toEqual(recordsFrom(folio));
});
