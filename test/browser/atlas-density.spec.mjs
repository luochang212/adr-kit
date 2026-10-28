import { test, expect } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderDecisionAtlas } from '../../dist/core/decision-atlas.js';
import { buildDecisionGraph } from '../../dist/core/graph.js';

const root = mkdtempSync(join(tmpdir(), 'adrkit-density-'));
process.on('exit', () => rmSync(root, { recursive: true, force: true }));
const template = readFileSync('skills/adrkit-visualize/examples/decision-atlas.html', 'utf8');

for (const theme of ['folio', 'signal']) {
  for (const language of ['en', 'zh']) {
    test(`${theme} / ${language}: daily density labels fit sparse and year-long histories`, async ({ page }) => {
      for (const days of [1, 8, 60, 366]) {
        const records = Array.from({ length: days }, (_, i) => ({
          number: i + 1, title: `Decision ${i + 1}`, folder: 'implemented',
          path: `adr/implemented/${i + 1}-decision.md`, fileName: `${i + 1}-decision.md`,
          status: 'implemented', date: '2026-01-01',
          created: new Date(Date.UTC(2025, 11, 1 + i)).toISOString().slice(0, 10),
          sections: [{ heading: 'Decision', body: 'Keep daily records.' }],
        }));
        const file = join(root, `${theme}-${language}-${days}.html`);
        writeFileSync(file, renderDecisionAtlas({
          template, records, graph: buildDecisionGraph(records), theme, language,
          commit: 'abc1234', repositoryUrl: 'https://example.com/project', projectName: 'Density fixture',
        }));
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(pathToFileURL(file).href);
        await expect(page.locator('.density-day')).toHaveCount(days);
        let desktopLabels;
        for (const width of [1280, 375, 320, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
          const layout = await page.locator('#density-chart').evaluate(chart => {
            const bounds = chart.getBoundingClientRect();
            const bars = [...chart.children];
            const labels = [...chart.querySelectorAll('span.density-label-visible')];
            const rects = labels.map(label => label.getBoundingClientRect());
            return {
              labels: labels.length,
              ends: [bars[0], bars.at(-1)].every(bar => bar.querySelector('span').classList.contains('density-label-visible')),
              inside: rects.every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1),
              separate: rects.every((rect, i) => !i || rect.left >= rects[i - 1].right),
              singleLine: labels.every(label => {
                const range = document.createRange(); range.selectNodeContents(label);
                return range.getClientRects().length === 1;
              }),
              barsFit: bars.every(bar => bar.getBoundingClientRect().width > 0) && chart.scrollWidth <= chart.clientWidth + 1,
              countsFit: [...chart.querySelectorAll('b.density-label-visible')].every(count =>
                count.getBoundingClientRect().width <= count.parentElement.getBoundingClientRect().width),
              details: bars.every(bar => bar.title === bar.getAttribute('aria-label') && /^\d{4}-\d{2}-\d{2}/.test(bar.title)),
            };
          });
          expect(layout, JSON.stringify({ days, width, layout })).toMatchObject({ ends: true, inside: true, separate: true, singleLine: true, barsFit: true, countsFit: true, details: true });
          if (width === 1280) {
            if (desktopLabels !== undefined) expect(layout.labels).toBe(desktopLabels);
            desktopLabels = layout.labels;
            if (days <= 8) expect(layout.labels).toBe(days);
          }
          if (days >= 60) {
            expect(layout.labels).toBeLessThan(days);
            if (width === 320) expect(layout.labels).toBeLessThan(desktopLabels);
          }
          if (days === 366 && (width === 375 || width === 1280)) {
            await page.locator('#density-chart').scrollIntoViewIfNeeded();
            const path = test.info().outputPath(`${days}-days-${width}.png`);
            await page.locator('#overview-view').screenshot({ path });
            await test.info().attach(`${days}-days-${width}`, { path, contentType: 'image/png' });
          }
        }
      }
    });
  }
}
