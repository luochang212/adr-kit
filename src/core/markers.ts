import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import type { AdrRecord } from './adr.js';
import { ADR_DIR } from './config.js';
import { globMatches } from './glob.js';
import type { ValidationIssue } from './validate.js';

/**
 * Code cites the decision it implements with `@adr <number>`, so the link
 * between a record and its files runs both ways: `paths:` says which files a
 * decision governs, a citation says which decision a file follows. Validation
 * checks the citation still names a live implemented decision and that the
 * citing file sits inside that decision's scope — a citation left on a
 * superseded record is exactly the drift a file-level scope cannot see.
 *
 * Citations are optional: a record needs none, and a codebase may cite none.
 * Only the ones that exist are checked.
 */
const CITATION = /@adr\s+(\d+(?:\s*,\s*\d+)*)\b/gi;

/** Code and configuration only: a prose example is not a citation. */
const SCANNED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts', '.cs', '.rb', '.php',
  '.c', '.h', '.cc', '.cpp', '.hpp', '.swift', '.scala',
  '.sh', '.bash', '.zsh', '.sql', '.proto',
  '.vue', '.svelte', '.astro',
  '.yml', '.yaml', '.toml',
]);

/** Dependency and build trees never carry the repository's own citations. */
const SKIPPED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'coverage', '.astro', '.next', 'target',
  'vendor', 'third_party', 'Pods', 'bower_components',
  '.venv', 'venv', '__pycache__', '.tox', '.mypy_cache', '.pytest_cache',
  '.gradle', '.yarn',
]);

/** A generated or vendored file this large is not a place a person cites a decision. */
const MAX_FILE_BYTES = 1024 * 1024;

export interface Citation {
  /** 1-based line the citation appears on. */
  line: number;
  numbers: number[];
}

/** Every `@adr` citation in a text, keyed to the line it appears on. */
export function findCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const numbers = new Set<number>();
    for (const match of line.matchAll(CITATION)) {
      for (const part of match[1]!.split(',')) {
        const number = Number(part.trim());
        if (Number.isSafeInteger(number)) numbers.add(number);
      }
    }
    if (numbers.size > 0) {
      citations.push({ line: index + 1, numbers: [...numbers] });
    }
  });
  return citations;
}

/**
 * The issues behind every citation in the repository: a target that does not
 * exist, is no longer current, or does not govern the citing file. The message
 * names the line so the caller can jump straight to it.
 */
export function citationIssues(root: string, records: readonly AdrRecord[]): ValidationIssue[] {
  const byNumber = new Map<number, AdrRecord>();
  for (const record of records) {
    if (record.number !== undefined) byNumber.set(record.number, record);
  }

  const issues: ValidationIssue[] = [];
  const files = [...scannedFiles(root, issues)].sort((a, b) =>
    relative(root, a).localeCompare(relative(root, b)));
  for (const file of files) {
    let text: string | undefined;
    try {
      text = readText(file);
    } catch (error) {
      issues.push({ path: relative(root, file), message: `cannot read file for ADR citations: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    if (text === undefined) continue;
    const citations = findCitations(text);
    if (citations.length === 0) continue;
    const path = relative(root, file);
    const posixPath = path.split(sep).join('/');
    for (const citation of citations) {
      for (const number of citation.numbers) {
        const problem = citationProblem(byNumber.get(number), number, posixPath);
        if (problem !== undefined) {
          issues.push({ path, message: `line ${citation.line}: ${problem}` });
        }
      }
    }
  }
  return issues;
}

function citationProblem(record: AdrRecord | undefined, number: number, file: string): string | undefined {
  if (record === undefined) {
    return `cites ADR ${number}, which does not exist`;
  }
  if (record.status === 'superseded') {
    const successor = record.supersededBy === undefined ? '' : ` by ADR ${record.supersededBy}`;
    return `cites ADR ${number}, which was superseded${successor}`;
  }
  // A retired decision keeps `status: implemented` and moves to archived/.
  if (record.folder === 'archived') {
    return `cites ADR ${number}, which is archived`;
  }
  if (record.status !== 'implemented') {
    return `cites ADR ${number}, which is not an implemented decision`;
  }
  const paths = record.paths ?? [];
  if (paths.length > 0 && !paths.some((pattern) => globMatches(pattern, file))) {
    return `cites ADR ${number}, but the file is outside its paths (${paths.join(', ')})`;
  }
  return undefined;
}

function* scannedFiles(root: string, issues: ValidationIssue[]): Generator<string> {
  const queue = [root];
  for (let index = 0; index < queue.length; index += 1) {
    const dir = queue[index]!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      issues.push({ path: relative(root, dir) || '.', message: `cannot read directory for ADR citations: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    for (const entry of entries) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        // adr/ holds the records themselves; the root site/ is the published
        // documentation surface, whose copy is prose like Markdown.
        if (dir === root && (entry.name === ADR_DIR || entry.name === 'site')) continue;
        if (!SKIPPED_DIRS.has(entry.name)) queue.push(child);
        continue;
      }
      // Symlinks are not followed: they can leave the repository or loop.
      if (!entry.isFile()) continue;
      if (SCANNED_EXTENSIONS.has(extname(entry.name).toLowerCase())) yield child;
    }
  }
}

function readText(file: string): string | undefined {
  if (statSync(file).size > MAX_FILE_BYTES) return undefined;
  const bytes = readFileSync(file);
  // A NUL byte marks binary content that cannot hold a citation.
  if (bytes.includes(0)) return undefined;
  return bytes.toString('utf8');
}
