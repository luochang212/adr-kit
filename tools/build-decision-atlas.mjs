#!/usr/bin/env node
// Regenerate the published decision atlas from the repository's current
// records. Run by the site build (site/package.json predev/prebuild); the
// generated pages stay out of Git and are pinned to the checkout's commit.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderThemePreview } from './atlas-preview.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const templatePath = join(root, 'skills/adrkit-visualize/examples/decision-atlas.html');
const defaultOutDir = join(root, 'site/public/decisions');
const projectName = 'ADR Kit';

/** Public previews are deterministic; CLI theme selection remains independent. */
export const SITE_PAGES = [
  { theme: 'folio', language: 'zh', file: 'folio.html' },
  { theme: 'folio', language: 'en', file: 'folio.en.html' },
  { theme: 'signal', language: 'zh', file: 'signal.html' },
  { theme: 'signal', language: 'en', file: 'signal.en.html' },
];
export const SITE_THEMES = [...new Set(SITE_PAGES.map(page => page.theme))];
export const SITE_PREVIEW_PAGES = [
  { language: 'zh', file: 'index.html' },
  { language: 'en', file: 'en.html' },
];
export const SITE_HTML_FILES = [...SITE_PAGES, ...SITE_PREVIEW_PAGES].map(page => page.file);

function repositoryUrl() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  // Keep in step with normalizeRepositoryUrl in src/commands/atlas.ts: the
  // published footer needs a browser URL from whatever git form the manifest
  // carries, including SSH remotes like git@host:owner/repo.git.
  return String(manifest.repository?.url ?? '')
    .replace(/^git\+/, '')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function commit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown';
  }
}

async function loadCore() {
  try {
    return {
      ...(await import('../dist/core/repository.js')),
      ...(await import('../dist/core/graph.js')),
      ...(await import('../dist/core/decision-atlas.js')),
    };
  } catch (error) {
    throw new Error(
      `the CLI is not built; run "npm run build" at the repository root first.\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

let core;
/** Reject a name the site cannot serve; `random` belongs to the CLI, not a build. */
export function selectSiteTheme(value = 'folio') {
  if (!SITE_THEMES.includes(value)) {
    throw new Error(`the site publishes ${SITE_THEMES.join(' or ')}, not "${value}"`);
  }
  return value;
}

/**
 * Write one theme’s bilingual pages. `outDir` also supports isolated previews
 * and browser fixtures; cleanup belongs to the complete site build.
 */
export async function renderAtlasPages({ theme = 'folio', outDir = defaultOutDir, languages = ['zh', 'en'] } = {}) {
  const chosen = selectSiteTheme(theme);
  core ??= await loadCore();
  const records = core.listRecords(root, ['implemented', 'archived']);
  const graph = core.buildDecisionGraph(records);
  const template = readFileSync(templatePath, 'utf8');
  const pages = SITE_PAGES.filter(page => page.theme === chosen && languages.includes(page.language));
  mkdirSync(outDir, { recursive: true });
  for (const { file, language } of pages) {
    writeFileSync(join(outDir, file), core.renderDecisionAtlas({
      template,
      records,
      graph,
      commit: commit(),
      repositoryUrl: repositoryUrl(),
      projectName,
      language,
      theme: chosen,
    }));
  }
  return {
    theme: chosen,
    files: pages.map(({ file }) => file),
    records: records.length,
    references: graph.referenceEdges.length,
    outDir,
  };
}

/** Build all public previews before removing obsolete generated HTML files. */
export async function buildSiteAtlases({ outDir = defaultOutDir } = {}) {
  const results = [];
  for (const theme of SITE_THEMES) results.push(await renderAtlasPages({ theme, outDir }));
  const favicon = 'data:image/svg+xml;base64,' + readFileSync(join(root, 'assets/favicon-light.svg')).toString('base64');
  for (const { language, file } of SITE_PREVIEW_PAGES) {
    const screenshots = Object.fromEntries(SITE_THEMES.map(theme => [theme,
      'data:image/png;base64,' + readFileSync(join(root, `assets/decision-atlas-${theme}${language === 'zh' ? '.zh' : ''}.png`)).toString('base64'),
    ]));
    writeFileSync(join(outDir, file), renderThemePreview({
      language, pages: SITE_PAGES, screenshots, favicon, commit: commit(), repositoryUrl: repositoryUrl(),
    }));
  }
  const keep = new Set(SITE_HTML_FILES);
  for (const entry of readdirSync(outDir)) {
    if (entry.endsWith('.html') && !keep.has(entry)) rmSync(join(outDir, entry));
  }
  return { outDir, files: [...keep], records: results[0].records, references: results[0].references };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await buildSiteAtlases();
    console.log(
      `wrote ${result.files.join(' and ')} in ${result.outDir.slice(root.length + 1)} (folio/signal, zh/en): ${result.records} records, ${result.references} references`,
    );
  } catch (error) {
    console.error(`build-decision-atlas: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
