import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * The short HEAD commit hash of the repository containing `cwd`, or undefined
 * when git is unavailable, `cwd` is not inside a git repository, or the repo
 * has no commits yet. Silent by design: the commit stamp is an enhancement
 * (it anchors a decision to the code state it was recorded against), never a
 * failure. Callers stamp `commit` into the front matter only when defined.
 */
export function gitHead(cwd: string): string | undefined {
  try {
    const hash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return hash.length > 0 ? hash : undefined;
  } catch {
    return undefined;
  }
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10_000,
  });
}

/**
 * The repository root git reports for `root`, in the one spelling node's
 * `path.relative` can compare against: git may print a different alias than
 * the paths node received (Windows CI hands out temp dirs as 8.3 short names,
 * RUNNER~1, while git prints the long form). Only the native realpath expands
 * those; the JS one keeps the spelling it was handed.
 */
function gitToplevel(root: string): string {
  return realpathSync.native(runGit(root, ['rev-parse', '--show-toplevel']).replace(/\r?\n$/, ''));
}

/**
 * Every file git regards as part of the repository: tracked files plus
 * untracked files that no ignore rule excludes, restricted to those under
 * `root` and returned as repo-relative POSIX paths. `undefined` when git is
 * unavailable or `root` is not inside a repository, so callers can fall back
 * to walking the filesystem.
 *
 * Ignored paths are absent by design: a build output, dependency tree, or
 * local archive is not part of the repository other people check out, so it
 * is neither a place a decision is cited nor a place validation should read.
 */
export function gitListedFiles(root: string): string[] | undefined {
  try {
    const toplevel = gitToplevel(root);
    const listing = runGit(toplevel, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
    const adrRoot = realpathSync.native(root);
    const paths = new Set<string>();
    for (const path of listing.split('\0')) {
      if (path.length === 0) continue;
      const scoped = relative(adrRoot, resolve(toplevel, path));
      if (scoped === '..' || scoped.startsWith(`..${sep}`) || isAbsolute(scoped)) continue;
      paths.add(scoped.split(sep).join('/'));
    }
    return [...paths];
  } catch {
    return undefined;
  }
}

/** Git file inputs are literal paths, including deleted files and rename origins. */
export function gitChangedPaths(root: string, options: { base?: string; staged?: boolean }): string[] {
  try {
    const gitRoot = gitToplevel(root);
    const base = options.base === undefined ? undefined : runGit(gitRoot, [
      'rev-parse', '--verify', '--end-of-options', `${options.base}^{commit}`,
    ]).trim();
    // --no-renames reports a rename as deletion + addition, retaining both
    // endpoints without parsing status scores. -z preserves arbitrary names.
    const diff = runGit(gitRoot, [
      'diff', '--name-only', '-z', '--no-renames', '--no-ext-diff', '--no-textconv',
      ...(options.staged ? ['--cached'] : [base!]), '--',
    ]);
    const untracked = options.staged ? '' : runGit(gitRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
    const adrRoot = realpathSync.native(root);
    const paths = new Set<string>();
    for (const path of (diff + untracked).split('\0')) {
      if (path.length === 0) continue;
      const scoped = relative(adrRoot, resolve(gitRoot, path));
      if (scoped === '..' || scoped.startsWith(`..${sep}`) || isAbsolute(scoped)) continue;
      paths.add(scoped.split(sep).join('/'));
    }
    return [...paths].sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot read Git changes${options.base === undefined ? '' : ` from base "${options.base}"`}: ${message}`);
  }
}
