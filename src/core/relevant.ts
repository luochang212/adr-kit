import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { AdrRecord } from './adr.js';
import { globMatches } from './glob.js';
import { listRecords } from './repository.js';

/** One record whose `paths:` scope matched, with the glob that fired. */
export interface RelevantMatch {
  record: AdrRecord;
  pattern: string;
}

/**
 * Matches grouped by lifecycle folder in the reading posture ADR 20 defined.
 * Archived records are absent by design: frozen history is not read by
 * default, and `relevant` is a retrieval command, not an archive search.
 */
export interface RelevantResult {
  implemented: RelevantMatch[];
  proposed: RelevantMatch[];
  rejected: RelevantMatch[];
}

/** Directories a directory walk never descends into. */
const SKIPPED_DIRS = new Set(['.git', 'node_modules']);

/** Ceiling on a directory walk, so `adrkit relevant .` stays bounded. */
const WALK_LIMIT = 2000;

/** POSIX-style, separator-normalized form of a path for glob matching. */
function toPosix(path: string): string {
  return path.split(sep).join('/');
}

/**
 * The candidate path strings an input contributes: the input itself as a
 * repository-relative POSIX path when it lives inside the root (and as the
 * literal input otherwise), plus, for a directory, every file under it.
 * Relative inputs resolve against `cwd`, the directory the caller ran the
 * command from — not the repository root, so running from a subdirectory
 * behaves the way the shell already taught the user to expect. A walk is
 * bounded by WALK_LIMIT files and skips `.git` and `node_modules`, so the
 * common single-file case never walks at all.
 */
export function candidatePaths(root: string, input: string, cwd: string): string[] {
  const cleaned = input.replace(/\/+$/, '');
  const absolute = isAbsolute(cleaned) ? resolve(cleaned) : resolve(cwd, cleaned);
  const inside = relative(root, absolute);
  const base = inside.startsWith('..') || isAbsolute(inside) ? toPosix(cleaned) : toPosix(inside);

  let info;
  try {
    info = statSync(absolute);
  } catch {
    // A path that does not exist yet (a planned file) still matches as a
    // string: scope retrieval answers intent, not just the current tree.
    return [base];
  }
  if (!info.isDirectory()) return [base];

  const candidates = [base];
  const queue: string[] = [absolute];
  while (queue.length > 0 && candidates.length < WALK_LIMIT) {
    const dir = queue.shift()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (candidates.length >= WALK_LIMIT) break;
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) queue.push(child);
      } else if (entry.isFile()) {
        candidates.push(toPosix(relative(root, child)));
      }
    }
  }
  return candidates;
}

/**
 * Find the records whose `paths:` globs govern the given path(s). A record
 * without `paths:` never matches: this is scope retrieval, not full-text
 * search, and pretending otherwise would return confident nonsense.
 */
export function relevantRecords(root: string, inputs: readonly string[], cwd: string): RelevantResult {
  const candidates = new Set<string>();
  for (const input of inputs) {
    for (const candidate of candidatePaths(root, input, cwd)) candidates.add(candidate);
  }

  const result: RelevantResult = { implemented: [], proposed: [], rejected: [] };
  for (const record of listRecords(root)) {
    if (record.folder === 'archived' || record.paths === undefined) continue;
    for (const pattern of record.paths) {
      let matched = false;
      for (const candidate of candidates) {
        if (globMatches(pattern, candidate)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        const group =
          record.folder === 'implemented'
            ? result.implemented
            : record.folder === 'proposed'
              ? result.proposed
              : result.rejected;
        group.push({ record, pattern });
        break;
      }
    }
  }
  return result;
}
