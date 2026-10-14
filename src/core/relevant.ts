import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { AdrRecord } from './adr.js';
import { globMatches } from './glob.js';
import { listRecords } from './repository.js';

export interface RelevantMatch {
  record: AdrRecord;
  pattern: string;
}

export interface ScopeDiagnostic {
  path: string;
  message: string;
}

/** Complete acquisition is not proof that optional scopes cover all decisions. */
export interface RelevantResult {
  implemented: RelevantMatch[];
  proposed: RelevantMatch[];
  rejected: RelevantMatch[];
  diagnostics: ScopeDiagnostic[];
  unscopedCount: number;
}

const SKIPPED_DIRS = new Set(['.git', 'node_modules']);
const WALK_LIMIT = 2000;

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

/** Missing paths remain valid planned files; other acquisition failures are explicit. */
export function candidatePaths(root: string, input: string, cwd: string): {
  paths: string[];
  diagnostics: ScopeDiagnostic[];
} {
  const cleaned = input.replace(/\/+$/, '');
  const absolute = isAbsolute(cleaned) ? resolve(cleaned) : resolve(cwd, cleaned);
  const inside = relative(root, absolute);
  const base = inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)
    ? toPosix(cleaned) : toPosix(inside);
  const paths = [base];
  const diagnostics: ScopeDiagnostic[] = [];
  let info;
  try {
    info = statSync(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      diagnostics.push({ path: input, message: `cannot inspect path: ${error instanceof Error ? error.message : String(error)}` });
    }
    return { paths, diagnostics };
  }
  if (!info.isDirectory()) return { paths, diagnostics };

  const queue = [absolute];
  let fileCount = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const dir = queue[index]!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      diagnostics.push({
        path: toPosix(relative(root, dir)) || '.',
        message: `cannot read directory: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    for (const entry of entries) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) queue.push(child);
      } else if (entry.isFile()) {
        if (fileCount === WALK_LIMIT) {
          diagnostics.push({ path: input, message: `directory search truncated after ${WALK_LIMIT} files; pass narrower paths` });
          return { paths, diagnostics };
        }
        paths.push(toPosix(relative(root, child)));
        fileCount += 1;
      }
    }
  }
  return { paths, diagnostics };
}

/** The same scope matcher serves explicit paths and literal Git file inputs. */
export function relevantRecords(
  root: string,
  inputs: readonly string[],
  cwd: string,
  literalPaths = false,
): RelevantResult {
  const candidates = new Set<string>();
  const result: RelevantResult = {
    implemented: [], proposed: [], rejected: [], diagnostics: [], unscopedCount: 0,
  };
  for (const input of inputs) {
    const acquired = literalPaths ? { paths: [input], diagnostics: [] } : candidatePaths(root, input, cwd);
    acquired.paths.forEach((path) => candidates.add(path));
    result.diagnostics.push(...acquired.diagnostics);
  }

  const candidateList = [...candidates];
  // Frozen history is not an input to an active query, even when it is malformed.
  for (const record of listRecords(root, ['implemented', 'proposed', 'rejected'])) {
    if (record.paths === undefined || record.paths.length === 0) {
      result.unscopedCount += 1;
      continue;
    }
    for (const pattern of record.paths) {
      if (candidateList.some((candidate) => globMatches(pattern, candidate))) {
        const group = record.folder === 'implemented' ? result.implemented
          : record.folder === 'proposed' ? result.proposed : result.rejected;
        group.push({ record, pattern });
        break;
      }
    }
  }
  return result;
}
