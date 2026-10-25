import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderAtlasPages, SITE_THEME, SITE_THEMES } from '../../tools/build-decision-atlas.mjs';

// The site publishes one theme at a time, so the gate renders both named themes
// from the same records into a temp tree and checks what the build would serve
// if the switch were flipped (ADR 40).
const fixtureRoot = mkdtempSync(join(tmpdir(), 'adrkit-atlas-pages-'));
process.on('exit', () => rmSync(fixtureRoot, { recursive: true, force: true }));
const artifact = (language, theme = SITE_THEME) =>
  pathToFileURL(join(fixtureRoot, theme, language === 'en' ? 'en.html' : 'index.html')).href;

test.beforeAll(async () => {
  for (const theme of SITE_THEMES) await renderAtlasPages({ theme, outDir: join(fixtureRoot, theme) });
});

test('the published atlas serves one theme and keeps both pages', async () => {
  const published = join(process.cwd(), 'site/public/decisions');
  test.skip(!existsSync(published), 'run "npm run test:browser" to build the published pages first');
  expect(readdirSync(published).filter((file) => file.endsWith('.html')).sort()).toEqual(['en.html', 'index.html']);
  for (const file of ['index.html', 'en.html']) {
    expect(readFileSync(join(published, file), 'utf8')).toContain(`data-atlas-theme="${SITE_THEME}"`);
  }
  expect(SITE_THEMES).toContain(SITE_THEME);
});

for (const theme of ['folio', 'signal']) {
test(`${theme}: generated theme survives reload and system appearance changes`, async ({ page }) => {
  await page.goto(artifact('en', theme));
  for (const colorScheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-atlas-theme', theme);
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme))
      .toBe(theme === 'folio' ? 'light' : 'dark');
    // Records discuss themes, so a bare /theme|主题/ name match would hit their
    // own cards. A switch must be absent by offering the switch itself, and no
    // piece of page chrome may mention themes at all.
    await expect(page.getByRole('button', { name: /^\s*(?:switch|toggle|change)\s+theme\s*$|^\s*切换主题\s*$/i }))
      .toHaveCount(0);
    await expect(page.locator('.chapter-bar, .page-hero, .page-footer')
      .getByRole('button', { name: /theme|主题/i })).toHaveCount(0);
  }
});
test(`${theme}: locks the page scrollbar behind the open reader`, async ({ page }) => {
  await page.goto(artifact('en', theme));
  const root = page.locator('html');
  // With persistent scrollbars the page's own bar renders beside the reader's
  // as a second, dead scrollbar while the modal is open; the lock removes it,
  // and the reserved gutter keeps the toggle from shifting the layout.
  await expect(root).toHaveCSS('scrollbar-gutter', 'stable');
  await expect(root).not.toHaveCSS('overflow-y', 'hidden');
  const scrollY = await page.evaluate(() => {
    scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' });
    return window.scrollY;
  });
  await page.locator('.decision-card').first().click();
  await expect(page.locator('#reader')).toBeVisible();
  await expect(root).toHaveCSS('overflow-y', 'hidden');
  await page.locator('#reader').evaluate(el => { el.scrollTop = 120; });
  await expect(page.locator('#reader')).toHaveCSS('overflow-y', 'auto');
  await page.keyboard.press('Escape');
  await expect(page.locator('#reader')).not.toBeVisible();
  await expect(root).not.toHaveCSS('overflow-y', 'hidden');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});
for (const language of ['zh', 'en']) {
  test(`${theme} / ${language}: reader groups provenance separately from navigable references`, async ({ page }) => {
    await page.goto(artifact(language, theme));
    await page.locator('.decision-card[data-record="11"]').click();
    await expect(page.locator('.ctx-facts dt')).toHaveText(language === 'zh'
      ? ['提出', '决定', '创建'] : ['Raised', 'Decided', 'Created']);
    await expect(page.locator('.ctx-facts dd')).toHaveText(language === 'zh'
      ? ['人', '人', '2026-09-22'] : ['Human', 'Human', '2026-09-22']);
    await expect(page.locator('.ctx-facts time')).toHaveAttribute('datetime', '2026-09-22');
    const facts = await page.locator('.ctx-facts>div').evaluateAll(elements => elements.map(el => ({
      top: el.getBoundingClientRect().top,
      labelBottom: el.querySelector('dt').getBoundingClientRect().bottom,
      valueTop: el.querySelector('dd').getBoundingClientRect().top,
    })));
    expect(Math.max(...facts.map(item => item.top)) - Math.min(...facts.map(item => item.top))).toBeLessThan(1);
    expect(facts.every(item => item.valueTop > item.labelBottom)).toBe(true);
    let visibleRows = 0;
    for (const [index, direction] of ['from', 'to'].entries()) {
      const count = await page.locator(`.edge.reference[data-${direction}="11"]`).count();
      if (!count) continue;
      const row = page.locator('.ctx-relations>div').nth(visibleRows++);
      await expect(row.locator('dt')).toHaveText((language === 'zh'
        ? ['引用了', '被引用'] : ['References', 'Referenced by'])[index]);
      await expect(row.locator('.record-pill')).toHaveCount(count);
    }
    await expect(page.locator('.ctx-relations>div')).toHaveCount(visibleRows);
    const reference = page.locator('.ctx-relations button.record-pill').first();
    const number = (await reference.textContent()).replace('ADR ', '');
    await reference.click();
    await expect(page.locator('.meta-num')).toHaveText(`ADR ${number.padStart(2, '0')}`);
  });

  test(`${theme} / ${language}: range hover preserves the viewport outline`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(artifact(language, theme));
    const rail = page.locator('.range-rail');
    await rail.scrollIntoViewIfNeeded();
    const date = page.locator('.range-segment[data-date="2026-09-24"]');
    const box = await date.boundingBox();
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.click(center.x, center.y);
    await page.mouse.move(0, 0);
    const thumb = page.locator('.range-thumb');
    const before = await thumb.boundingBox();
    await page.mouse.move(center.x, center.y);
    await expect(date).toHaveClass(/preview/);
    // Date segments paint above the selection. Their hover fill must let the
    // selection's top/bottom border show through instead of cutting two gaps.
    const alpha = await date.evaluate(el => {
      const color = getComputedStyle(el).backgroundColor;
      return color.startsWith('rgba(') ? parseFloat(color.split(',')[3]) : 1;
    });
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(1);
    expect(await thumb.boundingBox()).toEqual(before);
    await page.mouse.move(0, 0);
    await expect(page.locator('.range-segment.preview')).toHaveCount(0);
    await thumb.focus();
    const position = await thumb.getAttribute('aria-valuenow');
    await page.keyboard.press('ArrowRight');
    await expect(thumb).not.toHaveAttribute('aria-valuenow', position);
  });

  for (const width of [390, 1440]) {
    test(`${theme} / ${language} / ${width}px: accessible document and reader`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(artifact(language, theme));
      const audit = () => {
        const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
        // Signal keeps its original page design by explicit maintainer request.
        // Its inactive chapter-number spans have an existing 3.15:1 contrast.
        // Exclude only those spans; the rest of the document and reader stay gated.
        if (theme === 'signal') builder.exclude('.chapter-links>a>span');
        return builder.analyze();
      };
      expect((await audit()).violations).toEqual([]);
      await page.locator('.decision-card').first().click();
      expect((await audit()).violations).toEqual([]);
    });
  }

  for (const width of [320, 390, 768, 1440, 1920]) {
    test(`${theme} / ${language} / ${width}px: offline document, navigation and readable record`, async ({ page }) => {
      const errors = [], network = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (/^https?:/.test(request.url())) network.push(request.url());
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(artifact(language, theme));
      await expect(page.locator('h1')).toHaveText('ADR Kit');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const columns = await page.locator('#decision-cards').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width > 1000 ? 3 : width > 640 ? 2 : 1);
      const summaries = await page.locator('.decision-card p').evaluateAll((elements, count) =>
        elements.slice(0, count).map(el => el.getBoundingClientRect().top), columns);
      expect(Math.max(...summaries) - Math.min(...summaries)).toBeLessThan(1);
      const links = page.locator('.chapter-links a');
      for (let i = 0; i < await links.count(); i++) {
        const link = links.nth(i), target = await link.getAttribute('href');
        await link.click();
        await expect(page.locator(target)).toBeInViewport();
      }
      await page.locator('.decision-card:not(.archived-card)').first().click();
      await expect(page.locator('#reader')).toBeVisible();
      await expect(page.locator('#reader-source')).toHaveAttribute('href', /\/blob\/[a-f0-9]+\/adr\//);
      if (theme === 'signal') {
        await expect(page.locator('.reader-head #reader-meta + #reader-source')).toBeVisible();
        await expect(page.locator('.reader-byline #reader-source')).toHaveCount(0);
      } else {
        await expect(page.locator('.reader-head #reader-source')).toHaveCount(0);
        await expect(page.locator('.reader-byline #reader-source')).toBeVisible();
        const byline = await page.locator('#reader-source').boundingBox();
        const tags = await page.locator('#reader-tags').boundingBox();
        expect(byline.x).toBeCloseTo(tags.x, 0);
        expect(byline.y).toBeGreaterThanOrEqual(tags.y + tags.height);
      }
      await expect(page.locator('#reader-body h3').first()).toBeVisible();
      const type = await page.locator('#reader-body').evaluate(el => ({
        size: parseFloat(getComputedStyle(el).fontSize),
        width: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));
      expect(type.size).toBeGreaterThanOrEqual(15);
      expect(type.scrollWidth).toBeLessThanOrEqual(type.width);
      await page.locator('#reader').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(page.locator('#close-reader')).toBeInViewport();
      await page.locator('#close-reader').click();
      await expect(page.locator('#reader')).not.toBeVisible();
      expect(errors).toEqual([]);
      expect(network).toEqual([]);
    });
  }

  test(`${theme} / ${language}: search, history, record navigation and scrolling over the map`, async ({ page }) => {
    await page.goto(artifact(language, theme));
    const count = await page.locator('.decision-card').count();
    await page.locator('#directory-search').fill('#31');
    await expect(page.locator('.decision-card')).toHaveCount(1);
    await expect(page.locator('.decision-card')).toHaveAttribute('data-record', '31');
    await page.locator('#directory-search').fill('no-matching-record-xyz');
    await expect(page.locator('.directory-empty')).toBeVisible();
    await page.locator('#directory-search').fill('');
    await expect(page.locator('.decision-card')).toHaveCount(count);
    await page.locator('.archived-card').first().click();
    await expect(page.locator('.meta-status')).toHaveClass(/archived/);
    await expect(page.locator('#reader-body')).not.toBeEmpty();
    const title = await page.locator('#reader-title').textContent();
    await page.locator('#reader-next').click();
    await expect(page.locator('#reader-title')).not.toHaveText(title);
    await page.locator('#reader-prev').click();
    await expect(page.locator('#reader-title')).toHaveText(title);
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toBeVisible();
    const node = page.locator('#world .node').first();
    await node.click();
    await expect(page.locator('#reader')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toBeVisible();
    await page.locator('#viewport').scrollIntoViewIfNeeded();
    await page.locator('#viewport').hover();
    const scroll = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 180);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll);
    for (const button of ['#plus', '#minus', '#fit', '#reset']) {
      await page.locator(button).click();
      await expect(page.locator('#zoom')).not.toHaveText('NaN%');
    }
  });
}

test(`${theme}: large text reflows without document overflow or unreachable reader controls`, async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(artifact('en', theme));
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(theme === 'folio' ? '.hero-actions .primary-link' : '.chapter-links a[href="#cards-view"]').click();
  await page.locator('.decision-card').first().click();
  await expect(page.locator('#close-reader')).toBeInViewport();
  await page.locator('#close-reader').click();
  await expect(page.locator('#reader')).not.toBeVisible();
});

}

for (const theme of ['folio', 'signal']) {
test(`${theme}: preserves the original insight height budget`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(artifact('zh', theme));
  await expect(page.locator('.hero-actions')).toHaveCount(theme === 'signal' ? 0 : 1);
  const panels = await page.locator('.insight-columns>.atlas-section').evaluateAll(elements => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return elements.map(el => {
      const rows = [...el.querySelectorAll('#reference-hubs>li,.replacement-row')].filter(row => !row.hidden);
      return {
        height: el.getBoundingClientRect().height,
        visible: rows.length,
        rowHeight: rows.length ? rows[0].getBoundingClientRect().height : 0,
        target: 40 * rem,
        ceiling: 50 * rem,
      };
    });
  });
  expect(panels[1].visible).toBeGreaterThanOrEqual(3);
  expect(panels[0].height).toBeLessThan(panels[1].height);
  // Each panel fills to the closest row count around the 40rem target; the gap
  // between them therefore follows platform font metrics, so the budget is
  // "within one row of the target" rather than a fixed pixel difference.
  for (const [index, panel] of panels.entries()) {
    expect(Math.abs(panel.height - panel.target), `panel ${index} targets 40rem`).toBeLessThan(panel.rowHeight);
    expect(panel.height, `panel ${index} stays under 50rem`).toBeLessThanOrEqual(panel.ceiling);
  }
});
}



for (const theme of ['folio', 'signal']) {
  for (const width of [320, 1440]) {
    test(`${theme} / ${width}px: omits empty reference directions and restores populated rows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(artifact('zh', theme));
      for (const [outgoing, incoming] of [[0, 0], [0, 12], [12, 0], [1, 12], [0, 0]]) {
        await page.evaluate(({ outgoing, incoming }) => {
          const others = [...document.querySelectorAll('.decision-card')].map(el => el.dataset.record).filter(n => n !== '11');
          document.querySelectorAll('.edge.reference').forEach((edge, index) => {
            edge.dataset.from = index < outgoing ? '11' : index < outgoing + incoming ? others[index - outgoing] : '1';
            edge.dataset.to = index < outgoing ? others[index] : index < outgoing + incoming ? '11' : '2';
          });
        }, { outgoing, incoming });
        await page.locator('.decision-card[data-record="11"]').click();
        const labels = [outgoing ? '引用了' : null, incoming ? '被引用' : null].filter(Boolean);
        await expect(page.locator('.ctx-relations')).toHaveCount(labels.length ? 1 : 0);
        await expect(page.locator('.ctx-relations dt')).toHaveText(labels);
        const contextStyle = await page.locator('#reader-context').evaluate(el => {
          const style = getComputedStyle(el);
          return { border: parseFloat(style.borderBottomWidth), padding: parseFloat(style.paddingBottom) };
        });
        expect(contextStyle.border).toBe(labels.length ? 1 : 0);
        expect(contextStyle.padding).toBe(labels.length ? 24 : 0);
        const rows = page.locator('.ctx-relations>div');
        const counts = [outgoing, incoming].filter(Boolean);
        for (let index = 0; index < counts.length; index++) {
          await expect(rows.nth(index).locator('.record-pill')).toHaveCount(counts[index]);
        }
        const boxes = await rows.evaluateAll(elements => elements.map(el => {
          const { x, y, height } = el.getBoundingClientRect();
          return { x, y, height, overflow: el.scrollWidth > el.clientWidth };
        }));
        expect(boxes.every(box => !box.overflow)).toBe(true);
        if (boxes.length === 2) {
          expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
          expect(boxes[1].x).toBeCloseTo(boxes[0].x, 0);
        }
        await expect(page.locator(theme === 'signal' ? '.reader-head #reader-source' : '.reader-byline #reader-source')).toBeVisible();
        await page.locator('#close-reader').click();
      }
    });
  }
}
