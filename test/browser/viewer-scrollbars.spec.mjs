import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderDecisionMapHtml } from '../../dist/core/graph-html.js';
import { renderCardTree } from '../../dist/core/deliberation-html.js';
import { buildDecisionGraph } from '../../dist/core/graph.js';
import { listRecords } from '../../dist/core/repository.js';

const root = mkdtempSync(join(tmpdir(), 'adrkit-scrollbars-'));
process.on('exit', () => rmSync(root, { recursive: true, force: true }));
const pages = {
  map: renderDecisionMapHtml(buildDecisionGraph(listRecords(process.cwd(), ['implemented', 'archived']))),
  tree: renderCardTree([{ text: 'A decision', children: [{ type: 'question', text: 'Why?', children: [] }] }], 'A decision'),
};
for (const [name, html] of Object.entries(pages)) writeFileSync(join(root, name + '.html'), html);

for (const name of Object.keys(pages)) {
  test(`${name}: native scrollbar styling leaves canvas and fallback scrolling intact`, async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(pathToFileURL(join(root, name + '.html')).href);
    await expect(page.locator('body')).toHaveClass(/interactive/);
    await expect(page.locator('main')).toHaveCSS('overflow', 'hidden');
    // Styling must not introduce a page scrollbar around the interactive canvas.
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await page.setViewportSize({ width: 390, height: 240 });
    await page.locator('.viewer-info > summary').click();
    const panel = page.locator('.viewer-panel');
    await expect(panel).toHaveCSS('scrollbar-width', 'thin');
    await expect(panel).not.toHaveCSS('scrollbar-color', 'auto');
    await panel.hover();
    await page.mouse.wheel(0, 300);
    await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(panel).toHaveCSS('scrollbar-color', 'auto');

    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const fallback = await context.newPage();
      await fallback.goto(pathToFileURL(join(root, name + '.html')).href);
      await expect(fallback.locator('main')).toHaveCSS('overflow', 'auto');
      await expect(fallback.locator('main')).toHaveCSS('scrollbar-width', 'thin');
      await expect(fallback.locator('html')).toHaveCSS('scrollbar-width', 'thin');
    } finally { await context.close(); }
  });
}
