import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Exercise the tarball's CLI and installed resources outside the source tree.
// The browser gate builds dist/ first, exactly as a release would.
test('packed CLI and init/update reproduce both atlas themes in another repository', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const root = mkdtempSync(join(tmpdir(), 'adrkit-package-desk-'));
  // Run npm's JS entry directly: Windows cannot execFileSync a .cmd shim.
  const npmCli = process.env.npm_execpath || (process.platform === 'win32'
    ? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    : realpathSync(execFileSync('which', ['npm'], { encoding: 'utf8' }).trim()));
  const npm = (...args) => execFileSync(process.execPath, [npmCli, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const [packed] = JSON.parse(npm('pack', '--json', '--ignore-scripts', '--pack-destination', root));
    const consumer = join(root, 'consumer');
    mkdirSync(consumer);
    // Supply the already-installed runtime dependency locally, so this test
    // validates package portability without depending on registry availability.
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({
      private: true, name: 'another-project', dependencies: {
        'adr-kit': `file:${join(root, packed.filename)}`,
        yaml: `file:${resolve('node_modules/yaml')}`,
      },
    }));
    npm('install', '--prefix', consumer, '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false');
    const cli = join(consumer, 'node_modules/adr-kit/bin/adrkit.js');
    const run = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: consumer, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    run('init', '--workflows', 'visualize', '--tools', 'claude');
    const skill = join(consumer, '.agents/skills/adrkit-visualize/SKILL.md');
    const resource = join(consumer, '.agents/skills/adrkit-visualize/examples/decision-atlas.html');
    const template = readFileSync(resolve('skills/adrkit-visualize/examples/decision-atlas.html'), 'utf8');
    for (const target of ['.agents', '.claude']) {
      expect(readFileSync(join(consumer, target, 'skills/adrkit-visualize/SKILL.md'), 'utf8'))
        .toContain('shuffled desk of real decision files');
      expect(readFileSync(join(consumer, target, 'skills/adrkit-visualize/examples/decision-atlas.html'), 'utf8')).toBe(template);
    }
    writeFileSync(skill, 'stale instructions');
    writeFileSync(resource, 'stale template');
    run('update');
    expect(readFileSync(resource, 'utf8')).toBe(template);
    expect(readFileSync(skill, 'utf8')).toContain('a quiet reset only after exhaustion');
    for (let number = 1; number <= 4; number++) {
      writeFileSync(join(consumer, `adr/implemented/${number}-file.md`), `---
status: implemented
date: 2026-10-26
created: 2026-10-26
---

# ADR: ${number} External choice ${number}

## Problem

A decision from another project.

## Decision

Keep the project's own content.
`);
    }
    for (const language of ['en', 'zh']) {
      const out = join(consumer, `${language}.html`);
      run('atlas', '--theme', 'signal', '--lang', language, '--out', out);
      await page.goto(pathToFileURL(out).href);
      await expect(page.locator('html')).toHaveAttribute('data-atlas-theme', 'signal');
      await expect(page.locator('.hero-heading h1')).toHaveText('another-project');
      const taken = [];
      for (let index = 0; index < 4; index++) {
        const card = page.locator('.archive-card[data-depth="0"]');
        taken.push(Number(await card.getAttribute('data-record')));
        await expect(card.locator('.archive-id')).toHaveText(`ADR ${taken.at(-1)}`);
        await card.click();
        await expect(page.locator('#reader')).toHaveClass(/archive-left/);
        await expect(page.locator('.meta-num')).toHaveText(`ADR ${taken.at(-1)}`);
        const nextFile = await page.locator('.archive-card').count()
          ? await page.locator('.archive-card').first().getAttribute('data-record') : null;
        await page.mouse.click(1400, 760);
        await expect(page.locator('#reader')).not.toBeVisible();
        if (nextFile) await expect(page.locator('.archive-card').first()).toHaveAttribute('data-record', nextFile);
      }
      expect([...taken].sort()).toEqual([1, 2, 3, 4]);
      await expect(page.locator('.archive-reset')).toHaveText(language === 'en' ? '↻ Back on the desk' : '↻ 放回桌面');
      await page.locator('.archive-reset').click();
      await expect(page.locator('.archive-card')).toHaveCount(3);
    }
    for (const language of ['en', 'zh']) {
      const out = join(consumer, `folio-${language}.html`);
      run('atlas', '--theme', 'folio', '--lang', language, '--out', out);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(pathToFileURL(out).href);
      await expect(page.locator('html')).toHaveAttribute('data-atlas-theme', 'folio');
      await expect(page.locator('.page-hero #overview-view')).toHaveCount(1);
      await expect(page.locator('#density-chart')).toHaveCSS('height', '180px');
      const sizes = () => page.evaluate(() => ({
        intro: document.querySelector('.hero-content').getBoundingClientRect().height,
        density: document.querySelector('#overview-view').getBoundingClientRect().height,
        bottom: document.querySelector('#overview-view').getBoundingClientRect().bottom,
      }));
      const compact = await sizes();
      expect(compact.bottom).toBeCloseTo(900, 0);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const spacious = await sizes();
      expect(spacious.bottom).toBeCloseTo(1000, 0);
      // Spare height must reach both regions, not create one large gap below statistics.
      expect(spacious.intro).toBeGreaterThan(compact.intro);
      expect(spacious.density).toBeGreaterThan(compact.density);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
