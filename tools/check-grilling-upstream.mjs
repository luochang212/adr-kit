#!/usr/bin/env node
// Gate: fail when the pinned upstream grilling directory has changed.
// Exit 0 = unchanged, 1 = drift, 2 = could not verify.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'assets/upstream/grilling/MANIFEST.json'), 'utf8'));
const tracked = Object.keys(manifest.files).sort();
const showDiff = process.argv.includes('--diff');

// Verify the vendored copies themselves before touching the network: editing an
// adaptation without refreshing MANIFEST.json is drift too, and the gate must
// catch it even when upstream is unreachable.
const vendoredProblems = [];
for (const file of tracked) {
  const vendoredPath = join(root, 'assets/upstream/grilling', file);
  const hash = createHash('sha256').update(readFileSync(vendoredPath, 'utf8'), 'utf8').digest('hex');
  if (hash !== manifest.files[file]) vendoredProblems.push('  ' + file + ': ' + manifest.files[file] + ' -> ' + hash);
}
if (vendoredProblems.length > 0) {
  console.error('vendored assets/upstream/grilling does not match MANIFEST.json:');
  for (const problem of vendoredProblems) console.error(problem);
  console.error('');
  console.error('Update the vendored copy and MANIFEST.json together after review.');
  process.exit(1);
}

const headers = { 'User-Agent': 'adr-kit-upstream-check', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;

function die(message) {
  console.error(message);
  process.exit(2);
}

function sleep(ms) {
  return new Promise(function (done) { setTimeout(done, ms); });
}

async function get(url, asJson) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return asJson ? await response.json() : await response.text();
    } catch (error) {
      last = error;
      if (attempt < 3) await sleep(attempt * 500);
    }
  }
  die('upstream check could not verify ' + url + ' (' + last.message + '); treating an unverifiable pin as failure');
}

const repo = manifest.repo;
const path = manifest.path;
const commits = await get('https://api.github.com/repos/' + repo + '/commits?path=' + encodeURIComponent(path) + '&per_page=1', true);
const latest = commits[0] && commits[0].sha;
if (!latest) die('upstream check: GitHub returned no commit for ' + path);

const tree = await get('https://api.github.com/repos/' + repo + '/git/trees/' + latest + '?recursive=1', true);
const prefix = path + '/';
const live = tree.tree
  .filter(function (entry) { return entry.type === 'blob' && entry.path.startsWith(prefix); })
  .map(function (entry) { return entry.path.slice(prefix.length); })
  .sort();

const problems = [];
if (live.join(',') !== tracked.join(',')) {
  problems.push('  file set changed: tracked [' + tracked.join(', ') + '] vs upstream [' + live.join(', ') + ']');
}
for (const file of tracked) {
  if (live.indexOf(file) === -1) continue;
  const content = await get('https://raw.githubusercontent.com/' + repo + '/' + latest + '/' + path + '/' + file, false);
  const hash = createHash('sha256').update(content, 'utf8').digest('hex');
  if (hash !== manifest.files[file]) problems.push('  ' + file + ': ' + manifest.files[file] + ' -> ' + hash);
}

const sameCommit = latest === manifest.commit;
if (problems.length === 0 && sameCommit) {
  console.log('upstream grilling unchanged at ' + latest);
  process.exit(0);
}
if (problems.length === 0) {
  console.error('upstream grilling commit moved to ' + latest + ' but the tracked files are byte-identical (pinned ' + manifest.commit + '). Refresh the pin.');
  process.exit(1);
}
if (sameCommit) console.error('pinned MANIFEST.json does not match upstream at ' + latest + ':');
else console.error('upstream grilling changed at ' + latest + ' (pinned ' + manifest.commit + '):');
for (const problem of problems) console.error(problem);

if (showDiff && live.length > 0) {
  console.error('');
  console.error('--- unified diff against vendored copies ---');
  const dir = mkdtempSync(join(tmpdir(), 'grilling-upstream-'));
  for (const file of tracked) {
    if (live.indexOf(file) === -1) continue;
    const content = await get('https://raw.githubusercontent.com/' + repo + '/' + latest + '/' + path + '/' + file, false);
    const livePath = join(dir, file.split('/').join('__'));
    writeFileSync(livePath, content);
    const result = spawnSync('diff', ['-u', join(root, 'assets/upstream/grilling', file), livePath], { encoding: 'utf8' });
    if (result.stdout) console.error(result.stdout);
  }
}
console.error('');
console.error('Update the adaptation and MANIFEST.json after review. This check never auto-syncs.');
process.exit(1);
