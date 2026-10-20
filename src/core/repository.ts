import {
  closeSync,
  existsSync,
  openSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';
import { ADR_DIR, CONFIG_FILE, configPath } from './config.js';
import { emptyArchiveManifest, writeArchiveManifest } from './archive-seal.js';
import { parseAdrFile, type AdrFolder, type AdrRecord } from './adr.js';

/** Lifecycle folders are the repository inventory. */
export const FOLDERS: AdrFolder[] = ['proposed', 'implemented', 'rejected', 'archived'];

export interface InitResult {
  root: string;
  created: string[];
}

function initConfig(tools: string[], workflows?: string[]): string {
  // The list spacing must match the yaml library's own emission byte for byte
  // (`[ a, b ]`, empty as `[]`), or a bare `adrkit update` would reformat the
  // config init wrote; test/integrations.test.ts holds the two emitters to it.
  const list = (values: string[]): string =>
    values.length === 0 ? '[]' : `[ ${values.join(', ')} ]`;
  // `tools` is always written as a top-level key: a fully commented-out YAML
  // document parses to null, and readConfig's mapping check would reject it.
  const toolsYaml = `tools: ${list(tools)}\n`;
  // `workflows` is written only when a subset was chosen: absent means all.
  const workflowsYaml =
    workflows === undefined ? '' : `\n# Workflow subset written by adrkit init --workflows.\nworkflows: ${list(workflows)}\n`;
  return `# ADR Kit configuration
# Fill in \`context\` and it is injected as a comment into every new
# proposal/decision template (adrkit propose / adrkit record).
# context: |
#   Tech stack: TypeScript
#   Conventions that decision records should respect.

# AI tool integrations written by adrkit init --tools.
${toolsYaml}${workflowsYaml}
# Optional per-status conventions. These are hints for writers and agents;
# validate does not enforce them (it cannot check prose).
# rules:
#   proposal:
#     - Keep proposals under 500 words.
#   decision:
#     - Always name the owning team.
`;
}

const INIT_README = `# Architecture Decision Records

This directory is the repository's memory against two agent failure modes:
drifting from long-term decisions while deep in a task, and forgetting settled
choices until they resurface as inconsistencies.

Records follow the lifecycle folders proposed/, implemented/, rejected/, and
archived/. The folders are a context budget as well as a lifecycle:
implemented/ is current authority and is read in full; proposed/ is intent and
is checked; rejected/ is anti-pattern memory and is checked;
archived/ is lowest-value frozen history and is not read by default. The four
folders are the whole record inventory: no other folder may sit under adr/ or
inside one of them, and a Markdown record at the adr/ root fails validation
rather than disappearing from the list command.

A proposal is unshipped even when its direction has been settled. Implemented
records describe shipped decisions and receive stable ADR numbers. A rejection
is a durable terminal record of a declined proposal: it is removed only when
another record owns the warning it blocks, never for appearing stale —
rejections are unnumbered and unsealed, so removing a redundant one cannot
reuse a number or break the archive. Archived records
are frozen history, not current authority. Each one is
sealed in adr/archived/MANIFEST.json; adrkit validate checks the seal, and
adrkit validate --base <git-ref> proves the archive only grows.

Never delete a numbered decision: its stable N may be referenced elsewhere.
Implemented records may refresh factual paths, symbols, and defaults, but a
changed choice needs a new record. Archive or supersede rather than erase it.

The canonical header includes status, date, and created: YYYY-MM-DD (the
birth date, never re-stamped). Numbered records declare raised-by: human | agent
and decided-by: human | agent; these are provenance declarations, not proof
of approval. Optional tags: [frontend] classify records by theme; optional
paths: [src/payments/**] scope a record to the files it governs.

Use adrkit propose for unshipped work, adrkit implement after it ships, and
adrkit record for an already-shipped decision. Use adrkit reject with a reason
for a proposal that will not ship. A full replacement archives the old
implemented record through adrkit supersede; adrkit archive also retires
implemented guidance whose rationale is no longer needed in the active set.

Run adrkit list to discover records. Read the relevant implemented/ records in
full, check the relevant proposed/ records for intent and the rejected/ records
for the bad cases they warn against, and consult archived/ only when a task
cites history. Do not decide relevance by title alone; when a task targets
specific files, adrkit relevant <path> retrieves the records scoped to them.
For actual changes, use adrkit relevant --base <review-base> or --staged.
Supplement scope matches with inventory reading for unscoped decisions and
resolve incomplete-search diagnostics; no match does not mean no constraints.
Run adrkit validate to check the repository.
`;

export function initRepository(targetDir: string, tools: string[] = [], workflows?: string[]): InitResult {
  const root = resolve(targetDir);
  const adrRoot = join(root, ADR_DIR);
  if (existsSync(adrRoot)) {
    throw new Error(`an ADR Kit repository already exists at ${adrRoot}`);
  }

  const created: string[] = [];
  mkdirSync(adrRoot, { recursive: true });
  created.push(ADR_DIR);
  for (const folder of FOLDERS) {
    const path = join(adrRoot, folder);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, '.gitkeep'), '');
    created.push(`${ADR_DIR}/${folder}`);
  }

  const config = configPath(root);
  writeFileSync(config, initConfig(tools, workflows));
  created.push(`${ADR_DIR}/${CONFIG_FILE}`);

  // The archive seal starts empty: archive and supersede append entries as
  // records retire, and validate checks the manifest against archived bytes.
  writeArchiveManifest(root, emptyArchiveManifest());
  created.push(`${ADR_DIR}/archived/MANIFEST.json`);

  const readme = join(adrRoot, 'README.md');
  writeFileSync(readme, INIT_README);
  created.push(`${ADR_DIR}/README.md`);

  return { root, created };
}

export function adrRoot(root: string): string {
  return join(root, ADR_DIR);
}

export function folderPath(root: string, folder: AdrFolder): string {
  return join(adrRoot(root), folder);
}

export function listRecords(root: string, folders: readonly AdrFolder[] = FOLDERS): AdrRecord[] {
  const records: AdrRecord[] = [];
  for (const folder of folders) {
    const dir = folderPath(root, folder);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const path = join(dir, entry);
      try {
        const record = parseAdrFile(path);
        record.folder = folder;
        records.push(record);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`failed to parse ${relative(root, path)}: ${message}`);
      }
    }
  }
  records.sort((a, b) => {
    const folderOrder = (folder: AdrFolder) => FOLDERS.indexOf(folder);
    const folderDelta = folderOrder(a.folder) - folderOrder(b.folder);
    if (folderDelta !== 0) return folderDelta;
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
    return a.fileName.localeCompare(b.fileName);
  });
  return records;
}

export function listProposals(root: string): AdrRecord[] {
  return listRecords(root).filter((record) => record.folder === 'proposed');
}

function fileNameMatchesQuery(fileName: string, needle: string): boolean {
  const bareName = fileName.replace(/\.md$/, '');
  const slug = bareName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/^\d+-/, '');
  return fileName === needle || bareName === needle || slug === needle;
}

/**
 * Fallback scan for resolveRecord when listRecords throws on a corrupt
 * record: parse what we can so a query for a healthy record still resolves.
 * A corrupt file whose name matches the query re-throws its parse error,
 * since that is the record the caller asked for.
 */
function listRecordsForResolve(root: string, needle: string): AdrRecord[] {
  const records: AdrRecord[] = [];
  for (const folder of FOLDERS) {
    const dir = folderPath(root, folder);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const path = join(dir, entry);
      try {
        const record = parseAdrFile(path);
        record.folder = folder;
        records.push(record);
      } catch (error) {
        const bareName = entry.replace(/\.md$/, '');
        const numberMatch = folder === 'implemented' || folder === 'archived' ? bareName.match(/^(\d+)-/) : null;
        const isTarget =
          fileNameMatchesQuery(entry, needle) ||
          (numberMatch !== null && numberMatch[1] === needle);
        if (isTarget) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`failed to parse ${relative(root, path)}: ${message}`);
        }
      }
    }
  }
  return records;
}

/**
 * The single candidate a query must resolve to, or the matching error: zero
 * candidates name the label that has none, several name every match so the
 * caller can disambiguate.
 */
function exactlyOne(root: string, query: string, candidates: AdrRecord[], label: string): AdrRecord {
  if (candidates.length === 0) {
    throw new Error(`no ${label} matches "${query}"`);
  }
  if (candidates.length > 1) {
    const paths = candidates.map((record) => relative(root, record.path)).join(', ');
    throw new Error(`"${query}" is ambiguous; matches: ${paths}`);
  }
  return candidates[0]!;
}

export function resolveRecord(root: string, query: string): AdrRecord {
  const needle = query.trim();
  let records: AdrRecord[];
  try {
    records = listRecords(root);
  } catch {
    records = listRecordsForResolve(root, needle);
  }
  const candidates = records.filter((record) => {
    if (fileNameMatchesQuery(record.fileName, needle)) return true;
    if (record.title === needle || `# ADR: ${record.title}` === needle) {
      return true;
    }
    if (record.folder === 'implemented' || record.folder === 'archived') {
      if (String(record.number ?? 0) === needle) {
        return true;
      }
      // list prints "[N] Title" and prose references quote the title without
      // its number, while the H1 stores "N Title"; accept the stripped form.
      if (record.title.replace(/^\d+\s+/, '') === needle) {
        return true;
      }
    }
    return false;
  });
  return exactlyOne(root, query, candidates, 'ADR');
}

export function nextDecisionNumber(root: string): number {
  let max = 0;
  for (const record of listRecords(root)) {
    if ((record.folder === 'implemented' || record.folder === 'archived') && (record.number ?? 0) > max) {
      max = record.number ?? 0;
    }
  }
  return max + 1;
}

export function writeRecord(root: string, folder: AdrFolder, fileName: string, content: string): string {
  const path = join(folderPath(root, folder), fileName);
  const numberMatch = (folder === 'implemented' || folder === 'archived')
    ? fileName.match(/^(\d+)-/)
    : null;
  if (numberMatch === null) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return path;
  }

  const number = Number(numberMatch[1]);
  const lockPath = join(adrRoot(root), `.write-${number}.lock`);
  let lock: number;
  try {
    // Exclusive creation arbitrates across processes before either the scan
    // or write. Lock by number across both lifecycle folders: an allocation
    // can become stale while another command archives that number.
    lock = openSync(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    throw new Error(
      `decision number ${number} is being written; re-run after the other writer finishes. ` +
      `If it was interrupted, confirm no writer is running before removing ${ADR_DIR}/.write-${number}.lock`,
    );
  }
  try {
    for (const candidateFolder of ['implemented', 'archived'] as const) {
      const dir = folderPath(root, candidateFolder);
      const collision = existsSync(dir)
        ? readdirSync(dir).find((entry) => {
            if (!entry.endsWith('.md') || Number(entry.match(/^(\d+)-/)?.[1]) !== number) return false;
            // Retirement stages the archive alongside the same source name.
            // Keep archived re-writes available to the retirement boundary;
            // new implemented decisions must never overwrite existing bytes.
            return !(folder === 'archived' && entry === fileName);
          })
        : undefined;
      if (collision !== undefined) {
        throw new Error(
          `decision number ${number} is already taken by ${ADR_DIR}/${candidateFolder}/${collision}; re-run to allocate the next number`,
        );
      }
    }
    // A removed lifecycle folder is recreated on write.
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, folder === 'implemented' ? { flag: 'wx' } : undefined);
    return path;
  } finally {
    closeSync(lock);
    rmSync(lockPath);
  }
}

export function removeRecord(record: AdrRecord): void {
  // Removal is idempotent: a record that is already gone is a completed move,
  // not a failure. Callers stage the replacement (archived/rejected/implemented)
  // before removing the source, so a vanished source means the move finished,
  // and ENOENT here would otherwise be reported as a half-completed lifecycle
  // move that still has both copies (see sourceRemovalFailure). Permission and
  // directory errors still surface.
  rmSync(record.path, { force: true });
}

export function resolveProposed(root: string, query: string): AdrRecord {
  const needle = query.trim();
  const candidates = listRecords(root).filter((record) =>
    record.folder === 'proposed' &&
    (fileNameMatchesQuery(record.fileName, needle) ||
      record.title === needle ||
      `# ADR: ${record.title}` === needle));
  return exactlyOne(root, query, candidates, 'proposal');
}

export function readRecord(record: AdrRecord): string {
  return readFileSync(record.path, 'utf8');
}

export function displayName(record: AdrRecord): string {
  if ((record.folder === 'implemented' || record.folder === 'archived') && Number.isInteger(record.number)) {
    const titleWithoutNumber = record.title.replace(/^\d+\s+/, '');
    return `[${record.number}] ${titleWithoutNumber}`;
  }
  return record.title;
}

export function relativePath(record: AdrRecord): string {
  // CLI output is user-visible text: paths stay POSIX-style on every host.
  return posix.join(ADR_DIR, record.folder, basename(record.path));
}
