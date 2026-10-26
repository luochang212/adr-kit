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
  stack: Array.from({ length: 5 }, (_, index) => record(index + 1, {
    folder: index === 3 ? 'archived' : 'implemented',
  })),
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

test.beforeEach(async ({ page }, info) => {
  // Freeze the deal for tests about interaction rather than randomness.
  if (!info.title.includes('shuffles every file')) await page.addInitScript(() => { Math.random = () => .999999; });
});

for (const language of ['en', 'zh']) {
  test(`signal / ${language}: archive stack consumes opened cards and offers reset only when exhausted`, async ({ page, fixturePages }) => {
    for (const variant of ['empty', 'unlinked', 'references', 'archive', 'stack']) {
      await page.goto(fixturePages[`signal-${language}-${variant}`]);
      const total = variants[variant].length;
      const top = page.locator('.archive-card[data-depth="0"]');
      const cards = page.locator('.archive-card');
      const reset = page.locator('.archive-reset');
      await expect(cards).toHaveCount(Math.min(3, total));
      await expect(reset).toHaveCount(0);
      if (!total) {
        await expect(page.locator('.archive-empty')).toBeVisible();
        continue;
      }
      for (let taken = 0; taken < total; taken++) {
        await expect(top).toHaveAttribute('data-record', String(total - taken));
        await expect(page.locator('.archive-card:enabled')).toHaveCount(Math.min(3, total - taken));
        await top.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#reader')).toBeVisible();
        await expect(page.locator('.meta-num')).toHaveText(`ADR ${String(total - taken)}`);
        await expect(cards).toHaveCount(Math.min(3, total - taken - 1));
        // Reader navigation uses the same records but does not take another card.
        if (taken === 0 && total > 1) {
          await page.locator('#reader-prev').click();
          await expect(page.locator('.meta-num')).toHaveText(`ADR ${String(total - 1)}`);
          await expect(top).toHaveAttribute('data-record', String(total - 1));
        }
        await page.keyboard.press('Escape');
        await expect(page.locator('#reader')).not.toBeVisible();
        if (taken + 1 < total) await expect(top).toBeFocused();
        else await expect(page.locator('.archive-empty')).toBeFocused();
      }
      await expect(page.locator('.archive-empty')).toBeVisible();
      await expect(cards).toHaveCount(0);
      // Directory access is independent, including files taken from the hero.
      await page.locator(`.decision-card[data-record="${total}"]`).click();
      await expect(page.locator('#reader')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#reader')).not.toBeVisible();
      await expect(reset).toHaveText(language === 'en' ? '↻ Back on the desk' : '↻ 放回桌面');
      await reset.click();
      await expect(cards).toHaveCount(Math.min(3, total));
      await expect(top).toBeFocused();
      await expect(reset).toHaveCount(0);
    }
  });
}

test('signal: shuffles every file without duplication and deals a fresh round on reset', async ({ page, fixturePages }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto(fixturePages['signal-en-stack']);
  const taken = [];
  for (let index = 0; index < 5; index++) {
    const top = page.locator('.archive-card[data-depth="0"]');
    taken.push(Number(await top.getAttribute('data-record')));
    await top.click();
    await expect(page.locator('#reader')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toBeVisible();
  }
  expect(taken).toEqual([4, 3, 2, 1, 5]);
  expect([...taken].sort()).toEqual([1, 2, 3, 4, 5]);
  await page.evaluate(() => { Math.random = () => .999999; });
  await page.locator('.archive-reset').click();
  await expect(page.locator('.archive-card')).toHaveCount(3);
  expect(await page.locator('.archive-card').evaluateAll(cards => cards.map(card => Number(card.dataset.record)))).toEqual([5, 4, 3]);
  await expect(page.locator('.archive-card[data-depth="0"]')).toBeFocused();
});

test('signal: back cards respond without shifting, opening or consuming files', async ({ page, fixturePages }) => {
  await page.goto(fixturePages['signal-en-stack']);
  const colors = await page.locator('.archive-card').evaluateAll(cards => cards.map(card => getComputedStyle(card.querySelector('.archive-sheet')).backgroundColor));
  expect(new Set(colors).size).toBe(1);
  const back = page.locator('.archive-card[data-depth="2"]');
  const before = await back.evaluate(el => ({ transform: getComputedStyle(el).transform, color: getComputedStyle(el.querySelector('.archive-sheet')).backgroundColor }));
  const point = await back.evaluate(el => {
    const rect = el.getBoundingClientRect();
    for (let y = rect.top + 4; y < rect.top + 60; y += 4) {
      for (let x = rect.left + 20; x < rect.right - 20; x += 8) {
        if (document.elementFromPoint(x, y)?.closest('.archive-card') === el) return { x, y };
      }
    }
    throw new Error('No exposed card surface');
  });
  await page.mouse.move(point.x, point.y);
  await expect.poll(() => back.evaluate(el => getComputedStyle(el.querySelector('.archive-sheet')).backgroundColor)).not.toBe(before.color);
  await expect(back).toHaveCSS('transform', before.transform);
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.archive-card')?.dataset.depth, point)).toBe('2');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.click(point.x, point.y);
  await expect(back).toHaveClass(/is-tapped/);
  await expect(page.locator('#reader')).not.toBeVisible();
  await expect(back).toHaveCSS('transform', before.transform);
  expect(await page.locator('.archive-card').evaluateAll(cards => cards.map(card => card.dataset.record))).toEqual(['5', '4', '3']);
  await page.locator('.archive-card[data-depth="1"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#reader')).not.toBeVisible();
  await expect(page.locator('.archive-card[data-depth="0"]')).toHaveAttribute('data-record', '5');
  await page.locator('.archive-card[data-depth="0"]').click();
  await expect(page.locator('.meta-num')).toHaveText('ADR 5');
});

for (const language of ['en', 'zh']) test(`signal / ${language}: desktop archive reader stays left and dismisses before another file can open`, async ({ page, fixturePages }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixturePages[`signal-${language}-stack`]);
  const reader = page.locator('#reader');
  const top = page.locator('.archive-card[data-depth="0"]');
  const box = await top.boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (const number of [5, 4, 3]) {
    if (number !== 5) {
      await page.mouse.click(point.x, point.y);
      await expect(reader).not.toBeVisible();
      await expect(top).toHaveAttribute('data-record', String(number));
    }
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('.meta-num')).toHaveText(`ADR ${number}`);
    expect(await reader.evaluate(el => el.matches(':modal'))).toBe(true);
    const bounds = await reader.boundingBox();
    expect(bounds.x).toBe(0);
    expect(bounds.x + bounds.width).toBeLessThan(box.x);
  }
  // Native modality keeps keyboard focus out of the covered desk.
  await page.locator('#close-reader').focus();
  for (const key of ['Tab', 'Shift+Tab']) for (let index = 0; index < 12; index++) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest('#reader'))).toBe(true);
  }
  // Even a direct focus request cannot reach a control behind the modal.
  await page.locator('#close-reader').focus();
  await top.evaluate(el => el.focus());
  await expect(page.locator('#close-reader')).toBeFocused();
  // Internal reader navigation retains the left presentation.
  await page.locator('#reader-prev').click();
  await expect(page.locator('.meta-num')).toHaveText('ADR 2');
  await expect(reader).toHaveClass(/archive-left/);
  // A directory pick switches the shared reader back to its ordinary right modal.
  expect(await reader.evaluate(el => getComputedStyle(el, '::backdrop').backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  await page.mouse.click(1400, 760);
  await expect(reader).not.toBeVisible();
  await expect(top).toBeFocused();
  await page.locator('.decision-card[data-record="1"]').click();
  await expect(page.locator('.meta-num')).toHaveText('ADR 1');
  await expect(reader).not.toHaveClass(/archive-left/);
  expect(await reader.evaluate(el => el.matches(':modal'))).toBe(true);
  expect((await reader.boundingBox()).x).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(reader).not.toBeVisible();
  // Archive mode adapts on resize without turning mobile into a split view.
  await page.evaluate(() => scrollTo(0, 0));
  await top.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(reader).not.toHaveClass(/archive-left/);
  expect(await reader.evaluate(el => el.matches(':modal'))).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(reader).toHaveClass(/archive-left/);
  expect(await reader.evaluate(el => el.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(reader).not.toBeVisible();
});

test('signal: reopening a file fades the body in once without restarting a stale swap', async ({ page, fixturePages }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(fixturePages['signal-en-stack']);
  await page.locator('.archive-card[data-depth="0"]').click();
  await expect(page.locator('#reader')).not.toHaveClass(/from-archive/);
  await page.locator('#reader-prev').click();
  await expect(page.locator('#reader-body')).toHaveClass(/swap/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#reader')).not.toBeVisible();
  const trace = await page.evaluate(async () => {
    const reader = document.querySelector('#reader');
    const body = document.querySelector('#reader-body');
    const opacity = [], animations = [];
    body.addEventListener('animationstart', event => animations.push(event.animationName));
    document.querySelector('.archive-card[data-depth="0"]').click();
    const start = performance.now();
    while (performance.now() - start < 850) {
      await new Promise(requestAnimationFrame);
      if (reader.open) opacity.push(Number(getComputedStyle(body).opacity));
    }
    return { opacity, animations };
  });
  expect(trace.animations).toEqual(['archive-content-in']);
  expect(trace.opacity.at(-1)).toBe(1);
  expect(trace.opacity.every((value, index) => !index || value >= trace.opacity[index - 1] - .01)).toBe(true);
});

test('signal: card expansion completes, cancels cleanly, and respects reduced motion', async ({ page, fixturePages }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(fixturePages['signal-en-stack']);
  const reader = page.locator('#reader');
  // Pause the extraction at its midpoint: the real card is moving, and the
  // modal/backdrop must not appear until that first phase has completed.
  await page.locator('.archive-card[data-depth="0"]').evaluate(el => {
    el.click();
    const extraction = el.getAnimations().find(animation => animation.effect.getKeyframes().some(frame => frame.transform));
    extraction.pause();
    extraction.currentTime = 80;
  });
  await expect(page.locator('.archive-card.is-pulling')).toHaveCount(1);
  await expect(reader).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.archive-card.is-pulling')).toHaveCount(0);
  await expect(page.locator('.archive-card[data-depth="0"]')).toHaveAttribute('data-record', '5');
  await page.locator('.archive-card[data-depth="0"]').click();
  await expect(reader).toHaveClass(/archive-open/);
  await expect.poll(() => reader.evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(reader).toHaveCSS('transform', 'none');
  await expect(reader).not.toHaveClass(/from-archive/);
  await page.keyboard.press('Escape');
  await expect(reader).not.toBeVisible();
  await page.locator('.archive-card[data-depth="0"]').click();
  await page.keyboard.press('Escape');
  await expect(reader).not.toBeVisible();
  await expect(reader).not.toHaveClass(/archive-open|from-archive/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.archive-card[data-depth="0"]').click();
  await expect(reader).toBeVisible();
  await expect(reader).not.toHaveClass(/archive-open|from-archive/);
  await expect(reader).toHaveCSS('transform', 'none');
  expect(errors).toEqual([]);
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
      expect((await page.locator('.card-num').allTextContents()).every(label => /^ADR [1-9]\d* \/ /.test(label))).toBe(true);
      await expect(page.locator('#timeline-section')).toHaveCount(records.length ? 1 : 0);
      await expect(page.locator('#inbound')).toHaveCount(variant === 'references' ? 1 : 0);
      await expect(page.locator('#replacements')).toHaveCount(variant === 'replacement' ? 1 : 0);
      await expect(page.locator('#provenance')).toHaveCount(variant === 'references' ? 1 : 0);
      await expect(page.locator('.insight-columns.single')).toHaveCount(['references', 'replacement'].includes(variant) ? 1 : 0);
      await expect(page.locator('.insight-columns')).toHaveCount(['references', 'replacement'].includes(variant) ? 1 : 0);
      await expect(page.locator('.legend-delib')).toHaveCount(0);
      await expect(page.locator('.legend-archive')).toHaveCount(records.some(r => r.folder === 'archived') ? 1 : 0);
      const chapters = await page.locator('.chapter-links a').evaluateAll(links => links.map(link => ({
        number: link.querySelector('span').textContent,
        resolves: !!document.querySelector(link.hash),
      })));
      expect(chapters.every((chapter, index) => chapter.resolves && chapter.number === String(index + 1))).toBe(true);
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
