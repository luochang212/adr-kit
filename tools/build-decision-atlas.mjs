#!/usr/bin/env node
// Regenerate the published decision atlas from the repository's current
// records. Run by the site build (site/package.json predev/prebuild); the
// generated page stays out of Git and is pinned to the checkout's commit.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const templatePath = join(root, 'skills/adrkit-visualize/examples/decision-atlas.html');
const target = join(root, 'site/public/decisions/index.html');
const projectName = 'ADR Kit';

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

let core;
try {
  core = {
    ...(await import('../dist/core/repository.js')),
    ...(await import('../dist/core/graph.js')),
    ...(await import('../dist/core/decision-atlas.js')),
  };
} catch (error) {
  console.error('build-decision-atlas: the CLI is not built; run "npm run build" at the repository root first.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const records = core.listRecords(root, ['implemented', 'archived']);
const graph = core.buildDecisionGraph(records);
const targetDir = dirname(target);
const pages = [
  { file: 'index.html', language: 'zh', theme: 'folio' },
  { file: 'en.html', language: 'en', theme: 'folio' },
  { file: 'signal.html', language: 'zh', theme: 'signal' },
  { file: 'signal.en.html', language: 'en', theme: 'signal' },
];

mkdirSync(targetDir, { recursive: true });
for (const { file, language, theme } of pages) {
  const html = core.renderDecisionAtlas({
    template: readFileSync(templatePath, 'utf8'),
    records,
    graph,
    commit: commit(),
    repositoryUrl: repositoryUrl(),
    projectName,
    language,
    theme,
  });
  writeFileSync(join(targetDir, file), html);
}
console.log(
  `wrote four atlas pages in ${targetDir.slice(root.length + 1)} (Folio and Signal, zh/en): ${records.length} records, ${graph.referenceEdges.length} references`,
);
