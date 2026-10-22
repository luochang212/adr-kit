import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parseAdrText, type AdrFolder, type AdrRecord } from './adr.js';
import { ADR_DIR, findRoot, requireRoot } from './config.js';
import { gitChangedPaths } from './git.js';
import { citationProblem, findCitations, isCitationScanPath } from './markers.js';
import { relevantRecords } from './relevant.js';
import { displayName, listRecords } from './repository.js';
import { formatIssues, validateRecord, validateRecordReferences, type ValidationIssue } from './validate.js';

const HOOK_MARKER = '# adrkit: managed pre-commit hook';
const FOLDERS = ['proposed', 'implemented', 'rejected', 'archived'] as const;

export interface HookCheckResult {
  ok: boolean;
  output: string;
}

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10_000,
  });
}

function firstLine(error: unknown): string {
  return error instanceof Error ? error.message.split('\n')[0]! : String(error);
}

function isRecordPath(path: string): boolean {
  if (!path.startsWith(`${ADR_DIR}/`) || !path.endsWith('.md')) return false;
  const parts = path.slice(ADR_DIR.length + 1).split('/');
  return parts.length === 2 && (FOLDERS as readonly string[]).includes(parts[0]!);
}

function hooksDir(root: string): string {
  const out = git(root, ['rev-parse', '--git-path', 'hooks']).trim();
  return isAbsolute(out) ? out : resolve(root, out);
}

/** The staged blob of `path`, or undefined when the index has no such file (a deletion). */
function stagedText(root: string, prefix: string, path: string): string | undefined {
  try {
    return git(root, ['show', `:${prefix}${path}`]);
  } catch {
    return undefined;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * The pre-commit check: hard-fail on staged records and citations that are
 * objectively invalid, then show which active decisions govern the staged
 * files. It never fails on "no record was written" — a hook cannot observe
 * whether a choice was settled, so that judgment stays with the committer.
 */
export function hookCheck(cwd: string): HookCheckResult {
  const root = findRoot(cwd);
  if (root === undefined) return { ok: true, output: '' };

  let staged: string[];
  let prefix: string;
  try {
    staged = gitChangedPaths(root, { staged: true });
    prefix = git(root, ['rev-parse', '--show-prefix']).trim();
  } catch {
    return { ok: true, output: '' };
  }
  if (staged.length === 0) return { ok: true, output: '' };

  const issues: ValidationIssue[] = [];
  let records: AdrRecord[] = [];
  try {
    records = listRecords(root);
  } catch (error) {
    issues.push({ path: ADR_DIR, message: `cannot read the record inventory: ${firstLine(error)}` });
  }
  const byNumber = new Map<number, AdrRecord>();
  for (const record of records) {
    if (record.number !== undefined) byNumber.set(record.number, record);
  }

  for (const path of staged) {
    if (!isRecordPath(path)) continue;
    const text = stagedText(root, prefix, path);
    if (text === undefined) continue;
    let record: AdrRecord;
    try {
      // The path is only reported; the text comes from the index, and a
      // repository-relative POSIX path keeps the message portable.
      record = parseAdrText(text, path);
      // The parser cannot know the folder; the path is the only source.
      record.folder = path.split('/')[1] as AdrFolder;
    } catch (error) {
      issues.push({ path, message: firstLine(error) });
      continue;
    }
    issues.push(...validateRecord(root, record));
    if (records.length > 0) issues.push(...validateRecordReferences(root, record, records));
  }

  for (const path of staged) {
    if (isRecordPath(path) || !isCitationScanPath(path)) continue;
    const text = stagedText(root, prefix, path);
    if (text === undefined || text.includes('\0')) continue;
    for (const citation of findCitations(text)) {
      for (const number of citation.numbers) {
        const problem = citationProblem(byNumber.get(number), number, path);
        if (problem !== undefined) issues.push({ path, message: `line ${citation.line}: ${problem}` });
      }
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      output: [
        'adrkit pre-commit: the staged records or citations are invalid.',
        '',
        formatIssues(issues),
        '',
        'Fix them, or bypass once with "git commit --no-verify".',
      ].join('\n'),
    };
  }

  const result = relevantRecords(root, staged, root, true);
  const lines = [`adrkit pre-commit: ${staged.length} staged file(s).`];
  if (result.implemented.length > 0) {
    lines.push('', 'Governed by active decisions:');
    for (const { record, pattern } of result.implemented) {
      lines.push(`  ${displayName(record)}  [${pattern}]`);
    }
    lines.push('', "If this change alters those records' paths, names, defaults, or mechanism, update them in this commit.");
  } else {
    lines.push('', 'No active record scopes the staged files; scope matching is not full-text search.');
  }
  lines.push('If the change settles a choice future work must live with, record it ("adrkit record") or park it ("adrkit note").');
  return { ok: true, output: lines.join('\n') };
}

/** Write the managed pre-commit hook, refusing to replace a hook adr-kit does not own. */
export function hookInstall(cwd: string, entry?: string): string {
  const root = requireRoot(cwd);
  let dir: string;
  try {
    dir = hooksDir(root);
  } catch (error) {
    throw new Error(`cannot locate the Git hooks directory: ${firstLine(error)}`);
  }
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'pre-commit');
  if (existsSync(file) && !readFileSync(file, 'utf8').includes(HOOK_MARKER)) {
    throw new Error(`refusing to replace ${file}: it is not managed by adr-kit; move it aside first`);
  }
  const resolved = entry === undefined
    ? undefined
    : (existsSync(entry) ? realpathSync(entry) : resolve(cwd, entry));
  const command = resolved === undefined ? 'adrkit' : `node ${shellQuote(resolved)}`;
  // Letting exec fail alone surfaces a bare module-loader trace; fail closed
  // with the remedy instead.
  const guard = resolved === undefined
    ? ''
    : `if [ ! -f ${shellQuote(resolved)} ]; then\n`
      + `  echo 'adrkit pre-commit: the checker this hook points at is gone.' >&2\n`
      + `  echo 'Reinstall it ("adrkit hook install"), remove the hook ("adrkit hook uninstall"), or bypass once with "git commit --no-verify".' >&2\n`
      + `  exit 1\nfi\n`;
  writeFileSync(
    file,
    `#!/bin/sh\n${HOOK_MARKER}\n# Installed by \`adrkit hook install\`; remove with \`adrkit hook uninstall\`.\n${guard}exec ${command} hook run\n`,
    { mode: 0o755 },
  );
  chmodSync(file, 0o755);
  return `installed the pre-commit hook at ${file}`;
}

/** Remove the managed pre-commit hook, leaving a hook adr-kit does not own untouched. */
export function hookUninstall(cwd: string): string {
  const root = requireRoot(cwd);
  let dir: string;
  try {
    dir = hooksDir(root);
  } catch (error) {
    throw new Error(`cannot locate the Git hooks directory: ${firstLine(error)}`);
  }
  const file = join(dir, 'pre-commit');
  if (!existsSync(file)) return 'no pre-commit hook is installed';
  if (!readFileSync(file, 'utf8').includes(HOOK_MARKER)) {
    throw new Error(`refusing to remove ${file}: it is not managed by adr-kit`);
  }
  rmSync(file);
  return `removed the pre-commit hook at ${file}`;
}
