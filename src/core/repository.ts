import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { ADR_DIR, CONFIG_FILE, configPath, requireRoot } from './config.js';
import { parseAdrFile, type AdrFolder, type AdrRecord } from './adr.js';

export const FOLDERS: AdrFolder[] = ['decisions', 'proposed', 'rejected'];

export interface InitResult {
  root: string;
  created: string[];
}

const INIT_CONFIG = `# OpenADR configuration
# Project context is shown to agents and humans when they create records.
context: |
  <!-- Describe the project: tech stack, conventions, domain, and any
       standing rules that a decision record should respect. -->

# Optional per-status rules. Example:
# rules:
#   proposal:
#     - Keep proposals under 500 words.
#   decision:
#     - Always name the owning team.
`;

const INIT_README = `# Architecture Decision Records

This directory is an OpenADR repository. Each record is plain Markdown with a
machine-checkable header and lifecycle folders.

## Folders

| Folder | Meaning |
| --- | --- |
| \`decisions/\` | Accepted decisions, numbered \`NNNN\`, current truth |
| \`proposed/\` | Proposals that are not yet accepted or rejected |
| \`rejected/\` | Rejected proposals, frozen for the record |

## Record format

Every record starts with exactly:

\`\`\`markdown
# ADR: <title>

Status: proposed | accepted | rejected — <reason>
\`\`\`

Accepted decisions use \`# ADR: NNNN <title>\` and require
\`Problem\`, \`Decision\`, \`Alternatives considered\`, and \`Consequences\`.
Proposals require \`Problem\`, \`Proposal\`, \`Alternatives considered\`,
\`Acceptance criteria\`, and \`Risks\`.

Run \`openadr validate\` to check every record.
`;

export function initRepository(targetDir: string): InitResult {
  const root = resolve(targetDir);
  const adrRoot = join(root, ADR_DIR);
  if (existsSync(adrRoot)) {
    throw new Error(`OpenADR already exists at ${adrRoot}`);
  }

  const created: string[] = [];
  mkdirSync(adrRoot, { recursive: true });
  created.push(ADR_DIR);
  for (const folder of FOLDERS) {
    const path = join(adrRoot, folder);
    mkdirSync(path, { recursive: true });
    created.push(`${ADR_DIR}/${folder}`);
  }

  const config = configPath(root);
  writeFileSync(config, INIT_CONFIG);
  created.push(`${ADR_DIR}/${CONFIG_FILE}`);

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

export function resolveRecord(root: string, query: string): AdrRecord {
  const records = listRecords(root);
  const normalized = query.trim();
  const candidates = records.filter((record) => {
    if (record.fileName === normalized || record.fileName === `${normalized}.md`) {
      return true;
    }
    if (record.title === normalized || `# ADR: ${record.title}` === normalized) {
      return true;
    }
    if (record.folder === 'decisions') {
      const padded = String(record.number ?? 0).padStart(4, '0');
      if (padded === normalized || String(record.number ?? 0) === normalized) {
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
  return candidates[0]!;
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

export function todayStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function writeRecord(root: string, folder: AdrFolder, fileName: string, content: string): string {
  const path = join(folderPath(root, folder), fileName);
  writeFileSync(path, content);
  return path;
}

export function removeRecord(record: AdrRecord): void {
  rmSync(record.path);
}

export function readRecord(record: AdrRecord): string {
  return readFileSync(record.path, 'utf8');
}

export function displayName(record: AdrRecord): string {
  const label = record.folder === 'decisions' && record.number !== undefined
    ? `[${String(record.number).padStart(4, '0')}] ${record.title}`
    : `[${record.fileName.replace(/\.md$/, '')}] ${record.title}`;
  return label;
}

export function relativePath(root: string, record: AdrRecord): string {
  return join(ADR_DIR, record.folder, basename(record.path));
}
