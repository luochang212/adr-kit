import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';
import { ADR_DIR, CONFIG_FILE, configPath } from './config.js';
import { parseAdrFile, type AdrFolder, type AdrRecord } from './adr.js';

/** Durable records live in one folder; status is carried in the front matter. */
export const FOLDERS: AdrFolder[] = ['decisions'];

/**
 * Ephemeral proposal drafts. Created lazily on the first `adrkit propose`,
 * gitignored (init writes `adr/.gitignore`), never validated by `adrkit
 * validate` and never durable until `accept` promotes one into decisions/.
 */
export const DRAFTS_DIR = '.drafts';

export interface InitResult {
  root: string;
  created: string[];
}

function initConfig(tools: string[]): string {
  // tools 始终作为顶层键输出：全注释的 YAML 文档会被解析为空，
  // readConfig 的 isMap 检查会报 "top-level value must be a mapping"。
  const toolsYaml = `tools: [${tools.join(', ')}]\n`;
  return `# ADR Kit configuration
# Fill in \`context\` and it is injected as a comment into every new
# proposal/decision draft (adrkit propose / adrkit decide).
# context: |
#   Tech stack: TypeScript
#   Conventions that decision records should respect.

# AI tool integrations written by adrkit init --tools.
${toolsYaml}
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

This directory is an ADR Kit repository. Each record is plain Markdown with a
machine-checkable header. Decisions are durable; proposals are ephemeral drafts.

## Folders

| Folder | Meaning |
| --- | --- |
| \`decisions/\` | Decisions, numbered sequentially, immutable history (accepted or superseded) |
| \`.drafts/\` | Proposal drafts, gitignored and ephemeral - promote one with \`adrkit accept\` or discard it with \`adrkit reject\` |

Rejection is recorded in a decision's \`Alternatives considered\` section, never
as a standalone record.

## Record format

Every record starts with a YAML front matter block:

\`\`\`markdown
---
status: accepted | superseded
date: YYYY-MM-DD
commit: abc1234
---

# ADR: N <title>
\`\`\`

Decisions use \`# ADR: N <title>\` and require \`Problem\`, \`Decision\`,
\`Alternatives considered\`, and \`Consequences\`. Superseded decisions add
\`superseded-by: N\`. The \`date\` field records when the current status was
reached; the CLI stamps it at every lifecycle move, alongside the git \`commit\`
the decision was recorded against. Drafts (\`adr/.drafts/\`, \`status:
proposed\`) require \`Problem\`, \`Proposal\`, \`Alternatives considered\`,
\`Acceptance criteria\`, and \`Risks\`; \`adrkit accept\` promotes one into a
decision, and \`adrkit reject\` discards it without leaving a record.

Run \`adrkit validate\` to check every record.
`;

export function initRepository(targetDir: string, tools: string[] = []): InitResult {
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
  writeFileSync(config, initConfig(tools));
  created.push(`${ADR_DIR}/${CONFIG_FILE}`);

  // Drafts are ephemeral and must never be committed; the guard ships with init
  // so a draft can never leak into git, even before the first propose creates
  // the directory.
  const gitignore = join(adrRoot, '.gitignore');
  writeFileSync(gitignore, `${DRAFTS_DIR}\n`);
  created.push(`${ADR_DIR}/.gitignore`);

  const readme = join(adrRoot, 'README.md');
  writeFileSync(readme, INIT_README);
  created.push(`${ADR_DIR}/README.md`);

  return { root, created };
}

export function adrRoot(root: string): string {
  return join(root, ADR_DIR);
}

/**
 * Physical directory name for a folder value. The drafts folder is named
 * `.drafts` (dot-prefixed, gitignored) while the value carried on AdrRecord is
 * the bare `drafts`.
 */
function folderDirName(folder: AdrFolder): string {
  return folder === 'drafts' ? DRAFTS_DIR : folder;
}

export function folderPath(root: string, folder: AdrFolder): string {
  return join(adrRoot(root), folderDirName(folder));
}

export function listRecords(root: string): AdrRecord[] {
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
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`failed to parse ${relative(root, path)}: ${message}`);
      }
    }
  }
  records.sort((a, b) => {
    const folderOrder = (folder: AdrFolder) => FOLDERS.indexOf(folder);
    const folderDelta = folderOrder(a.folder) - folderOrder(b.folder);
    if (folderDelta !== 0) return folderDelta;
    if (a.folder === 'decisions') return (a.number ?? 0) - (b.number ?? 0);
    return a.fileName.localeCompare(b.fileName);
  });
  return records;
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
        const numberMatch = folder === 'decisions' ? bareName.match(/^(\d+)-/) : null;
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
    if (record.folder === 'decisions') {
      if (String(record.number ?? 0) === needle) {
        return true;
      }
    }
    return false;
  });

  if (candidates.length === 0) {
    throw new Error(`no ADR matches "${query}"`);
  }
  if (candidates.length > 1) {
    const paths = candidates.map((record) => relative(root, record.path)).join(', ');
    throw new Error(`"${query}" is ambiguous; matches: ${paths}`);
  }
  const first = candidates[0];
  if (first === undefined) {
    throw new Error(`no ADR matches "${query}"`);
  }
  return first;
}

export function nextDecisionNumber(root: string): number {
  let max = 0;
  for (const record of listRecords(root)) {
    if (record.folder === 'decisions' && (record.number ?? 0) > max) {
      max = record.number ?? 0;
    }
  }
  return max + 1;
}

export function writeRecord(root: string, folder: AdrFolder, fileName: string, content: string): string {
  const path = join(folderPath(root, folder), fileName);
  // mkdir-on-write: a target folder may not exist yet (e.g. .drafts/ before the
  // first propose, or a decisions/ that was removed). Creating it on demand
  // keeps every lifecycle command correct without eager directory ceremony.
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

export function removeRecord(record: AdrRecord): void {
  rmSync(record.path);
}

/** Path to the ephemeral drafts folder (`adr/.drafts/`). */
export function draftsPath(root: string): string {
  return join(adrRoot(root), DRAFTS_DIR);
}

export function listDrafts(root: string): AdrRecord[] {
  const dir = draftsPath(root);
  if (!existsSync(dir)) return [];
  const drafts: AdrRecord[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.md')) continue;
    const path = join(dir, entry);
    try {
      const draft = parseAdrFile(path);
      draft.folder = 'drafts';
      drafts.push(draft);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`failed to parse ${relative(root, path)}: ${message}`);
    }
  }
  drafts.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return drafts;
}

function draftMatchesQuery(draft: AdrRecord, needle: string): boolean {
  if (fileNameMatchesQuery(draft.fileName, needle)) return true;
  return draft.title === needle || `# ADR: ${draft.title}` === needle;
}

export function resolveDraft(root: string, query: string): AdrRecord {
  const needle = query.trim();
  const drafts = listDrafts(root);
  const candidates = drafts.filter((draft) => draftMatchesQuery(draft, needle));
  if (candidates.length === 0) {
    throw new Error(`no draft proposal matches "${query}"`);
  }
  if (candidates.length > 1) {
    const paths = candidates.map((draft) => relative(root, draft.path)).join(', ');
    throw new Error(`"${query}" is ambiguous; matches: ${paths}`);
  }
  return candidates[0]!;
}

export function readRecord(record: AdrRecord): string {
  return readFileSync(record.path, 'utf8');
}

export function displayName(record: AdrRecord): string {
  if (record.folder === 'decisions' && Number.isInteger(record.number)) {
    const titleWithoutNumber = record.title.replace(/^\d+\s+/, '');
    return `[${record.number}] ${titleWithoutNumber}`;
  }
  return record.title;
}

export function relativePath(record: AdrRecord): string {
  // 始终输出 POSIX 风格路径：CLI 输出是用户可见文本，Windows 上也要
  // 显示 adr/.drafts/... 而不是 adr\.drafts\...（与其它命令的硬编码
  // 拼接保持一致，且测试断言跨平台稳定）。
  return posix.join(ADR_DIR, folderDirName(record.folder), basename(record.path));
}
