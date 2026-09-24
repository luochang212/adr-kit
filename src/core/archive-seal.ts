import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NUMBERED_FILE_NAME_PATTERN } from './adr.js';
import { ADR_DIR } from './config.js';

/**
 * The archive seal. A committed manifest of every numbered record in
 * adr/archived/, one entry per file, appended in archival order. It turns
 * "archived records are frozen history" from a status label into bytes a
 * validator can check: every sealed path names its file's exact content.
 */
export const MANIFEST_VERSION = 1;
export const ARCHIVED_DIR = 'archived';
export const MANIFEST_FILE = 'MANIFEST.json';

export interface ArchiveSeal {
  /** Archive-relative file name, `N-slug.md`. */
  path: string;
  /** SHA-256 of the complete archived file bytes, lowercase hex. */
  sha256: string;
}

export interface ArchiveManifest {
  version: number;
  entries: ArchiveSeal[];
}

export function archivedManifestPath(root: string): string {
  return join(root, ADR_DIR, ARCHIVED_DIR, MANIFEST_FILE);
}

export function archivedRecordPath(root: string, fileName: string): string {
  return join(root, ADR_DIR, ARCHIVED_DIR, fileName);
}

/** Repository-relative display path used in output and validation issues. */
export function sealedDisplayPath(fileName: string): string {
  return `${ADR_DIR}/${ARCHIVED_DIR}/${fileName}`;
}

export function emptyArchiveManifest(): ArchiveManifest {
  return { version: MANIFEST_VERSION, entries: [] };
}

export function sealBytes(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Parse manifest text. Every structural problem throws naming `source`, so
 * validate can report the manifest as malformed and the archive commands can
 * preflight it before any file moves.
 */
export function parseArchiveManifest(text: string, source: string): ArchiveManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${source} is not valid JSON: ${detail}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${source} must be a JSON object`);
  }
  const fields = parsed as Record<string, unknown>;
  if (fields['version'] !== MANIFEST_VERSION) {
    throw new Error(`${source} must carry "version": ${MANIFEST_VERSION}`);
  }
  const entries = fields['entries'];
  if (!Array.isArray(entries)) {
    throw new Error(`${source} must carry an "entries" array`);
  }
  const seen = new Set<string>();
  const seals: ArchiveSeal[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`${source} entries must be objects`);
    }
    const entryFields = entry as Record<string, unknown>;
    const path = entryFields['path'];
    // The numbered-record pattern already excludes separators and `..`, so a
    // manifest entry can only ever name a file directly inside archived/.
    if (typeof path !== 'string' || !NUMBERED_FILE_NAME_PATTERN.test(path)) {
      throw new Error(
        `${source} entries must carry an archive-relative "path" like "N-slug.md", got ${JSON.stringify(path ?? null)}`,
      );
    }
    const sha256 = entryFields['sha256'];
    if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
      throw new Error(`${source} entry "${path}" must carry a hex SHA-256 "sha256"`);
    }
    if (seen.has(path)) {
      throw new Error(`${source} seals "${path}" more than once`);
    }
    seen.add(path);
    seals.push({ path, sha256 });
  }
  return { version: MANIFEST_VERSION, entries: seals };
}

/** Read and parse the repository's manifest, or undefined when absent. */
export function readArchiveManifest(root: string): ArchiveManifest | undefined {
  const path = archivedManifestPath(root);
  if (!existsSync(path)) return undefined;
  return parseArchiveManifest(
    readFileSync(path, 'utf8'),
    `${ADR_DIR}/${ARCHIVED_DIR}/${MANIFEST_FILE}`,
  );
}

export function writeArchiveManifest(root: string, manifest: ArchiveManifest): void {
  writeFileSync(archivedManifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Append one seal to a parsed manifest, refusing a second seal for the same
 * file: overwriting a seal would launder a change to archived bytes. Returns
 * a new manifest; callers own writing it to disk.
 */
export function appendSeal(manifest: ArchiveManifest, fileName: string, sha256: string): ArchiveManifest {
  if (manifest.entries.some((entry) => entry.path === fileName)) {
    throw new Error(`the archive manifest already seals ${fileName}`);
  }
  return { version: manifest.version, entries: [...manifest.entries, { path: fileName, sha256 }] };
}
