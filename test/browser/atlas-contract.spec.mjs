import { test as base, expect } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderDecisionAtlas } from '../../dist/core/decision-atlas.js';
import { buildDecisionGraph } from '../../dist/core/graph.js';

const record = (number, overrides = {}) => ({
  path: `adr/${overrides.folder || 'implemented'}/${number}-choice.md`, fileName: `${number}-choice.md`,
  folder: 'implemented', status: 'implemented', date: '2026-10-25',
  created: '2026-10-25', number, title: `Choice ${number}`,
  sections: [{ heading: 'Problem', body: '\nA choice to remember.\n' }],
  ...overrides,
});
const variants = {
  empty: [],
  unlinked: [record(1)],
  references: [record(1, { raisedBy: 'human', decidedBy: 'human' }), record(2, {
    sections: [{ heading: 'Decision', body: '\nUse ADR-1.\n' }],
  })],
  replacement: [record(1, { folder: 'archived', supersededBy: 2 }), record(2)],
  archive: [record(1, { folder: 'archived', archiveReason: 'Owned elsewhere.' })],
};
const test = base.extend({
  fixturePages: [async ({}, use) => {
    const directory = mkdtempSync(join(tmpdir(), 'adrkit-theme-contract-'));
    const template = readFileSync(new URL('../../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url), 'utf8');
    const files = {};
    try {
      for (const theme of ['folio', 'signal']) for (const language of ['en', 'zh']) {
        for (const [variant, records] of Object.entries(variants)) {
          const key = `${theme}-${language}-${variant}`;
          const path = join(directory, `${key}.html`);
          writeFileSync(path, renderDecisionAtlas({
            template, records, graph: buildDecisionGraph(records), theme, language,
            projectName: 'Contract fixture', commit: 'abc1234',
            repositoryUrl: 'https://github.com/example/fixture',
          }));
          files[key] = pathToFileURL(path).href;
        }
      }
      await use(files);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }, { scope: 'worker' }],
});

for (const theme of ['folio', 'signal']) for (const language of ['en', 'zh']) {
  test(`${theme} / ${language}: activates only available modules and renumbers chapters`, async ({ page, fixturePages }) => {
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    for (const width of [390, 1440]) for (const [variant, records] of Object.entries(variants)) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(fixturePages[`${theme}-${language}-${variant}`]);
      await expect(page.locator('.decision-card')).toHaveCount(records.length);
      await expect(page.locator('#timeline-section')).toHaveCount(records.length ? 1 : 0);
      await expect(page.locator('#inbound')).toHaveCount(variant === 'references' ? 1 : 0);
      await expect(page.locator('#replacements')).toHaveCount(variant === 'replacement' ? 1 : 0);
      await expect(page.locator('#provenance')).toHaveCount(variant === 'references' ? 1 : 0);
      await expect(page.locator('.insight-columns.single')).toHaveCount(['references', 'replacement'].includes(variant) ? 1 : 0);
      await expect(page.locator('.insight-columns')).toHaveCount(['references', 'replacement'].includes(variant) ? 1 : 0);
      await expect(page.locator('.legend-delib')).toHaveCount(0);
      await expect(page.locator('.legend-archive')).toHaveCount(['replacement', 'archive'].includes(variant) ? 1 : 0);
      const chapters = await page.locator('.chapter-links a').evaluateAll(links => links.map(link => ({
        number: link.querySelector('span').textContent,
        resolves: !!document.querySelector(link.hash),
      })));
      expect(chapters.every((chapter, index) => chapter.resolves && chapter.number === String(index + 1).padStart(2, '0'))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (variant === 'archive') {
        await page.locator('.archived-card').click();
        await expect(page.locator('#reader-body')).toContainText('A choice to remember.');
        await expect(page.locator('#reader-source')).toHaveAttribute('href', /\/blob\/abc1234\/adr\//);
        await page.locator('#close-reader').click();
      }
    }
    expect(errors).toEqual([]);
    expect(network).toEqual([]);
  });
}
