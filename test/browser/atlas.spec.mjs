import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderAtlasPages, buildSiteAtlases, SITE_PAGES, SITE_THEMES, SITE_HTML_FILES, SITE_PREVIEW_PAGES } from '../../tools/build-decision-atlas.mjs';

// Isolate behavioral fixtures from the published directory.
const fixtureRoot = mkdtempSync(join(tmpdir(), 'adrkit-atlas-pages-'));
process.on('exit', () => rmSync(fixtureRoot, { recursive: true, force: true }));
const artifact = (language, theme = 'folio') =>
  pathToFileURL(join(fixtureRoot, theme, SITE_PAGES.find(page => page.theme === theme && page.language === language).file)).href;

test.beforeAll(async () => {
  for (const theme of SITE_THEMES) await renderAtlasPages({ theme, outDir: join(fixtureRoot, theme) });
});

// The hero desk shows the record's Decision extract; mirror the template's
// derivation so the assertion follows the record set instead of pinning one
// record's text (which rots with every new record).
function decisionExcerpt(number, lifecycle) {
  const dir = join(process.cwd(), 'adr', lifecycle);
  const file = readdirSync(dir).find(entry => entry.startsWith(`${number}-`));
  const body = readFileSync(join(dir, file), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const decision = body.split(/^## Decision\s*$/m)[1]?.split(/^## /m)[0] ?? body;
  const paragraph = decision.split(/\n\s*\n/).find(candidate => candidate.trim() && !/^\s*(#|`{3})/.test(candidate)) ?? '';
  // Inline markers (code spans, bold, emphasis) become elements on the page,
  // so the plain text drops them.
  return paragraph.replace(/^\s*[-+*]\s+/, '')
    .replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ').trim();
}

test('the published atlas serves both themes and languages from the same records', async () => {
  const published = join(process.cwd(), 'site/public/decisions');
  test.skip(!existsSync(published), 'run "npm run test:browser" to build the published pages first');
  expect(readdirSync(published).filter(file => file.endsWith('.html')).sort()).toEqual([...SITE_HTML_FILES].sort());
  const payloads = [];
  for (const { file, theme, language } of SITE_PAGES) {
    const html = readFileSync(join(published, file), 'utf8');
    expect(html).toContain(`data-atlas-theme="${theme}"`);
    expect(html).toContain(`<html lang="${language === 'zh' ? 'zh-CN' : 'en'}"`);
    payloads.push(html.split('/* atlas:records */')[1].split('/* /atlas:records */')[0]);
  }
  expect(new Set(payloads).size).toBe(1);
});

test('site generation writes both themes before dropping obsolete HTML', async () => {
  const outDir = join(fixtureRoot, 'publish');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'obsolete.html'), 'old preview');
  writeFileSync(join(outDir, 'notes.txt'), 'unrelated file');
  await buildSiteAtlases({ outDir });
  expect(readdirSync(outDir).filter(file => file.endsWith('.html')).sort()).toEqual([...SITE_HTML_FILES].sort());
  expect(readFileSync(join(outDir, 'notes.txt'), 'utf8')).toBe('unrelated file');
});

for (const { language, file } of SITE_PREVIEW_PAGES) {
  test(`theme gallery: ${language} links to both named themes and stays usable on mobile`, async ({ page }) => {
    await page.goto(pathToFileURL(join(process.cwd(), 'site/public/decisions', file)).href);
    await expect(page).toHaveTitle(/ADR Kit/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('footer a')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveText(language === 'en'
      ? 'ADR KitDecision atlas' : 'ADR Kit决策档案');
    await expect(page.locator('.theme-card')).toHaveCount(2);
    await expect(page.locator('[hreflang]')).toHaveCount(1);
    await expect(page.locator('header .language')).toHaveAttribute('href', language === 'en' ? 'index.html' : 'en.html');
    await expect(page.locator('main a[hreflang]')).toHaveCount(0);
    await expect(page.getByText(/中文预览|English preview/)).toHaveCount(0);
    await expect(page.locator('.intro p')).toHaveText(language === 'en'
      ? 'The same complete history. Two ways to explore it.'
      : '同一段完整历史，两种探索方式。');
    await expect(page.locator('.card-heading a, a.card-heading, .preview-label')).toHaveCount(0);
    await expect(page.locator('.card-copy')).toHaveCount(0);
    for (const { theme, file: target } of SITE_PAGES.filter(entry => entry.language === language)) {
      await expect(page.locator(`.${theme} .open`)).toHaveAttribute('href', target);
      expect(await page.locator(`.${theme} .preview img`).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      // The declared reservation must match the intrinsic ratio, or the cards
      // shift the moment the image decodes. img.width reads the rendered
      // width, so the reservation comes from the content attributes.
      const reserved = await page.locator(`.${theme} .preview img`).evaluate(img => ({
        declared: Number(img.getAttribute('width')) / Number(img.getAttribute('height')),
        intrinsic: img.naturalWidth / img.naturalHeight,
      }));
      expect(reserved.declared).toBeCloseTo(reserved.intrinsic, 3);
      await page.locator(`.${theme} .open`).click();
      await expect(page.locator('html')).toHaveAttribute('data-atlas-theme', theme);
      await page.goBack();
    }
    // The Signal card title speaks the theme's own mono voice, so the gallery
    // keeps advertising what the theme actually looks like.
    const voice = await page.locator('.signal h2').evaluate(el => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily, weight: style.fontWeight };
    });
    expect(voice.family).toContain('monospace');
    expect(voice.weight).toBe('600');
    for (const width of [1280, 1920, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const img of await page.locator('.preview img').all()) {
        const ratios = await img.evaluate(image => ({
          source: image.naturalWidth / image.naturalHeight,
          displayed: image.clientWidth / image.clientHeight,
        }));
        expect(ratios.displayed).toBeCloseTo(ratios.source, 2);
      }
      const boxes = await page.locator('.theme-card').evaluateAll(cards => cards.map(card => ({ x: card.offsetLeft, y: card.offsetTop })));
      if (width < 760) {
        expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
        await page.locator('.mobile-nav a[href="#signal"]').click();
        await expect(page.locator('.signal .open')).toBeInViewport();
        await page.locator('.mobile-nav a[href="#folio"]').click();
      }
      if (width === 1280 || width === 375) {
        await test.info().attach(`gallery-${language}-${width}`, {
          body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
        });
      }
      if (width >= 768) {
        for (const theme of ['folio', 'signal']) {
          const coverage = await page.locator('.' + theme).evaluate(card =>
            card.querySelector('.preview').offsetWidth / card.clientWidth);
          expect(coverage).toBeGreaterThan(.6);
        }
        expect(await page.evaluate(() => document.documentElement.scrollHeight), 'one screen at ' + width).toBeLessThanOrEqual(801);
        // The gallery is a choice of two previews; both should be visible
        // before scrolling on a typical desktop, not buried below the hero.
        for (const preview of await page.locator('.card-actions').all()) {
          const box = await preview.boundingBox();
          expect(box.y + box.height).toBeLessThanOrEqual(800);
        }
      }
    }
    for (const [width, height] of [[1366, 768], [1280, 720], [375, 667]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height + 1);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.open')).toHaveCount(2);
    for (const img of await page.locator('.preview img').all()) {
      await expect(img).toBeVisible();
      expect(await img.evaluate(el => el.clientWidth)).toBeGreaterThan(100);
    }
    await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
    await page.setViewportSize({ width: 1280, height: 350 });
    for (const img of await page.locator('.preview img').all()) {
      await expect(img).toBeVisible();
      expect(await img.evaluate(el => el.clientWidth)).toBeGreaterThan(100);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const preview of await page.locator('.preview').all()) {
      await page.mouse.move(0, 0);
      const before = await preview.evaluate(el => ({
        shadow: getComputedStyle(el).boxShadow,
        border: getComputedStyle(el).borderColor,
        transform: getComputedStyle(el).transform,
      }));
      await preview.hover();
      const after = await preview.evaluate(el => ({
        shadow: getComputedStyle(el).boxShadow,
        border: getComputedStyle(el).borderColor,
        transform: getComputedStyle(el).transform,
      }));
      expect(after.shadow).not.toBe(before.shadow);
      expect(after.border).toBe(before.border);
      expect(after.transform).toBe(before.transform);
    }

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

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
    // own cards, including Signal's hero stack. Match the theme control's own
    // wording rather than a record title that happens to discuss themes.
    await expect(page.getByRole('button', { name: /^\s*(?:switch|toggle|change)\s+theme\s*$|^\s*切换主题\s*$/i }))
      .toHaveCount(0);
    await expect(page.locator('.chapter-bar, .page-hero, .page-footer')
      .getByRole('button', { name: /^(?:(?:switch|toggle|change)\s+theme|theme|切换主题|主题)$/i })).toHaveCount(0);
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
  const card = page.locator('.decision-card').first();
  // Navigation to the trigger belongs before the baseline: click/focus can
  // legitimately scroll an offscreen card into view on another platform.
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  const scrollY = await page.evaluate(() => window.scrollY);
  await card.click();
  await expect(page.locator('#reader')).toBeVisible();
  await expect(root).toHaveCSS('overflow-y', 'hidden');
  await page.locator('#reader').evaluate(el => { el.scrollTop = 120; });
  await expect(page.locator('#reader')).toHaveCSS('overflow-y', 'auto');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await page.keyboard.press('Escape');
  await expect(page.locator('#reader')).not.toBeVisible();
  await expect(root).not.toHaveCSS('overflow-y', 'hidden');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});
test(`${theme}: mobile map hides the legend while keeping controls and records usable`, async ({ page }) => {
  await page.goto(artifact('en', theme));
  const legend = page.locator('#decision-map .canvas-legend');
  for (const width of [390, 760, 761, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#decision-map').scrollIntoViewIfNeeded();
    if (width <= 760) await expect(legend).toBeHidden();
    else await expect(legend).toBeVisible();
    await expect(page.locator('#decision-map .controls')).toBeVisible();
    await page.locator('#world .node').first().click();
    await expect(page.locator('#reader')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toBeVisible();
  }
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
    await expect(page.locator('.meta-num')).toHaveText(`ADR ${number}`);
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
      // Both themes keep the source link in the sticky header, right after the
      // record identity; only its styling differs (ADR 39 presentation split).
      await expect(page.locator('.reader-head #reader-meta + #reader-source')).toBeVisible();
      await expect(page.locator('.reader-byline #reader-source')).toHaveCount(0);
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

for (const language of ['en', 'zh']) {
test(`signal / ${language}: hero retains hierarchy and fits desktop and mobile`, async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .999999; });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(artifact(language, 'signal'));
    const layout = await page.locator('.page-hero').evaluate(el => {
      const heading = el.querySelector('.hero-heading').getBoundingClientRect();
      const ledger = el.querySelector('.hero-archive').getBoundingClientRect();
      return {
        headingRight: heading.right, headingBottom: heading.bottom,
        ledgerLeft: ledger.left, ledgerTop: ledger.top,
        titleSize: parseFloat(getComputedStyle(el.querySelector('h1')).fontSize),
        bodySize: parseFloat(getComputedStyle(el.querySelector('.hero-description')).fontSize),
        overflows: el.scrollWidth > el.clientWidth,
      };
    });
    expect(layout.overflows).toBe(false);
    expect(layout.titleSize).toBeGreaterThanOrEqual(layout.bodySize * 3);
    if (width > 760) expect(layout.ledgerLeft).toBeGreaterThan(layout.headingRight);
    else expect(layout.ledgerTop).toBeGreaterThan(layout.headingBottom);
    const file = await page.locator('.archive-card[data-depth="0"]').evaluate(el => ({
      ratio: el.offsetWidth / el.offsetHeight,
      sheetColor: getComputedStyle(el.querySelector('.archive-sheet')).backgroundColor,
      shadowColor: getComputedStyle(el, '::before').backgroundColor,
    }));
    if (width >= 1024) {
      expect(file.ratio).toBeGreaterThan(1.35);
      expect(layout.ledgerLeft - layout.headingRight).toBeLessThanOrEqual(48);
    } else if (width <= 760) {
      // Narrow covers may grow vertically to fit their contents. Check the
      // readable surface rather than forcing a platform-dependent ratio.
      const surface = page.locator('.archive-card[data-depth="0"] .archive-sheet');
      const content = await surface.evaluate(sheet => {
        const box = sheet.getBoundingClientRect();
        const title = sheet.querySelector('.archive-title').getBoundingClientRect();
        const footer = sheet.querySelector('.archive-card-bottom').getBoundingClientRect();
        return {
          fits: sheet.scrollHeight <= sheet.clientHeight + 1,
          horizontal: sheet.scrollWidth <= sheet.clientWidth + 1,
          titleInside: title.top >= box.top && title.bottom <= box.bottom,
          footerInside: footer.top >= title.bottom && footer.bottom <= box.bottom,
        };
      });
      expect(content).toEqual({ fits: true, horizontal: true, titleInside: true, footerInside: true });
    }
    expect(file.shadowColor).not.toBe(file.sheetColor);
    await expect(page.locator('.archive-card')).toHaveCount(3);
    // Every exposed file number must remain unobscured by the sheets above it.
    for (const card of await page.locator('.archive-card').all()) {
      expect(await card.evaluate(el => {
        const box = el.querySelector('.archive-id').getBoundingClientRect();
        return [box.left + 2, box.right - 2].every(x =>
          document.elementFromPoint(x, box.top + box.height / 2)?.closest('.archive-card') === el);
      })).toBe(true);
    }

    const firstCard = page.locator('.archive-card').first();
    const firstNumber = await firstCard.getAttribute('data-record');
    await expect(page.locator('.archive-title').first()).not.toContainText(new RegExp('^' + firstNumber + '\\s'));
    await expect(page.locator('.archive-summary-label').first()).toHaveText(language === 'en' ? 'DECISION EXTRACT' : '决策摘录');
    const excerpt = decisionExcerpt(firstNumber, await firstCard.getAttribute('data-lifecycle'));
    await expect(page.locator('.archive-excerpt').first()).toContainText(excerpt.slice(0, 60));
    // A buried file tugs but never leaves the stack: the reader stays closed
    // and the deck keeps all three sheets.
    await page.locator('.archive-card[data-depth="1"] .archive-id').click();
    await expect(page.locator('#reader')).not.toBeVisible();
    await expect(page.locator('.archive-card')).toHaveCount(3);
    await expect(page.locator('.archive-card[data-depth="1"]')).toHaveCount(1);
    await expect(page.locator('.page-hero .stats-band')).toHaveCount(1);
    await expect(page.locator('.hero-baseline')).toHaveCount(0);
    if (width === 1440) {
      const statsBottom = await page.locator('.stats-band').evaluate(el => el.getBoundingClientRect().bottom);
      expect(statsBottom).toBeGreaterThanOrEqual(998);
      expect(statsBottom).toBeLessThanOrEqual(1000);
      const overviewTop = await page.locator('#overview-page').evaluate(el => el.getBoundingClientRect().top);
      expect(overviewTop).toBeGreaterThanOrEqual(1000);
    }
    await expect(page.locator('.hero-actions')).toHaveCount(0);
  }
});
}

for (const theme of ['folio', 'signal']) test(`${theme}: hero ends at the first-screen boundary before the overview`, async ({ page }) => {
  for (const language of ['en', 'zh']) for (const [width, height] of [[1440, 1000], [1440, 900], [1280, 800], [1366, 768], [1280, 720], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto(artifact(language, theme));
    const layout = await page.evaluate(() => ({
      next: document.querySelector('#overview-page').getBoundingClientRect().top,
      stats: document.querySelector('.stats-band').getBoundingClientRect().bottom,
      hero: document.querySelector('.page-hero').getBoundingClientRect().bottom,
    }));
    expect(layout.next).toBeGreaterThanOrEqual(height);
    if (theme === 'signal') expect(Math.abs(layout.stats - layout.hero)).toBeLessThanOrEqual(2);
    else {
      expect(layout.stats).toBeLessThanOrEqual(layout.hero);
      await expect(page.locator('.page-hero .stats-band')).toHaveCount(1);
      await expect(page.locator('.page-hero #overview-view')).toHaveCount(1);
      expect(layout.next).toBeGreaterThanOrEqual(layout.hero);
      const gap = await page.evaluate(() => document.querySelector('.stats-band').getBoundingClientRect().top
        - document.querySelector('.hero-content').getBoundingClientRect().bottom);
      expect(Math.abs(gap)).toBeLessThanOrEqual(1);
      const content = await page.locator('.hero-content').evaluate(el => ({
        padding: getComputedStyle(el).paddingTop,
        offset: el.getBoundingClientRect().top - el.closest('.page-hero').getBoundingClientRect().top,
      }));
      if (width > 760) {
        if (height >= 800) expect(layout.hero).toBeCloseTo(height, 0);
        const densityBottom = await page.locator('#overview-view').evaluate(el => el.getBoundingClientRect().bottom);
        expect(densityBottom).toBeCloseTo(layout.hero, 0);
        await expect(page.locator('#density-chart')).toHaveCSS('height', '180px');
      }
      expect(content.offset).toBe(0);
    }
    if (theme === 'signal' && width > 760 && height >= 800) expect(layout.hero).toBeCloseTo(height, 0);
    else expect(layout.hero).toBeGreaterThanOrEqual(height);
    await expect(page.locator('.stats-inner')).not.toContainText('含');
    expect(await page.locator('.page-hero').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (theme === 'folio' && width > 760 && height < 800) {
      const action = page.locator('.hero-actions .primary-link');
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeInViewport();
      await expect(action).toBeVisible();
    }
  }
});

for (const theme of ['folio', 'signal']) {
test(`${theme}: automatic page entrances stay inside the hero`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(artifact('en', theme));
  await page.locator('#density-chart').scrollIntoViewIfNeeded();
  await page.locator('#decision-cards').scrollIntoViewIfNeeded();
  const motion = await page.locator('.atlas-section,.atlas-section h2,.density-day,.decision-card,.page-footer').evaluateAll(elements => elements.map(el => {
    const style = getComputedStyle(el);
    return { animation: style.animationName, opacity: style.opacity, transform: style.transform };
  }));
  expect(motion.every(style => style.animation === 'none' && style.opacity === '1' && style.transform === 'none')).toBe(true);
  await expect(page.locator('.reveal,.load-in,#density-chart.play,#decision-cards.armed')).toHaveCount(0);
});
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
        await expect(page.locator('.reader-head #reader-source')).toBeVisible();
        await page.locator('#close-reader').click();
      }
    });
  }
}
