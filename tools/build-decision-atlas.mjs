#!/usr/bin/env node
// Regenerate the published decision atlas from the repository's current
// records. Run by the site build (site/package.json predev/prebuild); the
// generated pages stay out of Git and are pinned to the checkout's commit.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const templatePath = join(root, 'skills/adrkit-visualize/examples/decision-atlas.html');
const defaultOutDir = join(root, 'site/public/decisions');
const projectName = 'ADR Kit';

/**
 * The site publishes one atlas theme at a time: flip this word, or set
 * ATLAS_THEME for a single build, and /decisions/ serves the other theme.
 * Both themes stay renderable through `adrkit atlas --theme`, and the browser
 * gate renders each one as a fixture instead of publishing both (ADR 40).
 */
export const SITE_THEME = 'folio';
export const SITE_THEMES = ['folio', 'signal'];

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
export function selectSiteTheme(value = SITE_THEME) {
  if (!SITE_THEMES.includes(value)) {
    throw new Error(`the site publishes ${SITE_THEMES.join(' or ')}, not "${value}"`);
  }
  return value;
}

/**
 * Write the two site pages for one theme. `outDir` lets the browser gate
 * render each theme into a temp directory without touching the published tree.
 */
export async function renderAtlasPages({ theme = SITE_THEME, outDir = defaultOutDir, languages = ['zh', 'en'] } = {}) {
  const chosen = selectSiteTheme(theme);
  core ??= await loadCore();
  const records = core.listRecords(root, ['implemented', 'archived']);
  const graph = core.buildDecisionGraph(records);
  const template = readFileSync(templatePath, 'utf8');
  const pages = languages.map((language) => ({ file: language === 'en' ? 'en.html' : 'index.html', language }));
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
  // A previously published theme would otherwise ship beside this one.
  const keep = new Set(pages.map(({ file }) => file));
  for (const entry of readdirSync(outDir)) {
    if (entry.endsWith('.html') && !keep.has(entry)) rmSync(join(outDir, entry));
  }
  return {
    theme: chosen,
    files: pages.map(({ file }) => file),
    records: records.length,
    references: graph.referenceEdges.length,
    outDir,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await renderAtlasPages({ theme: process.env.ATLAS_THEME ?? SITE_THEME });
    console.log(
      `wrote ${result.files.join(' and ')} in ${result.outDir.slice(root.length + 1)} (${result.theme}, zh/en): ${result.records} records, ${result.references} references`,
    );
  } catch (error) {
    console.error(`build-decision-atlas: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
