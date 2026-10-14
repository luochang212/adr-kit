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

/**
 * True when `ref` resolves in the repository containing `cwd`. Base-aware
 * validation needs the distinction between "ref unreadable" (fail loudly)
 * and "file absent at ref" (a legitimate no-prior-seals state), so the two
 * checks stay separate.
 */
export function gitRefExists(cwd: string, ref: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

/** A file's content at a git ref, or undefined when it does not exist there. */
export function gitShow(cwd: string, ref: string, filePath: string): string | undefined {
  try {
    return execFileSync('git', ['show', `${ref}:${filePath}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

/** Git file inputs are literal paths, including deleted files and rename origins. */
export function gitChangedPaths(root: string, options: { base?: string; staged?: boolean }): string[] {
  const run = (cwd: string, args: string[]): string => execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10_000,
  });
  try {
    // The two roots meet in path.relative, which compares textually, so both
    // must come out in one spelling: git may report the toplevel through a
    // different alias than the paths Node received (Windows CI hands out temp
    // dirs as 8.3 short names, RUNNER~1, while git prints the long form).
    // Only the native realpath expands those; the JS one keeps the spelling
    // it was handed.
    const gitRoot = realpathSync.native(run(root, ['rev-parse', '--show-toplevel']).replace(/\r?\n$/, ''));
    const base = options.base === undefined ? undefined : run(gitRoot, [
      'rev-parse', '--verify', '--end-of-options', `${options.base}^{commit}`,
    ]).trim();
    // --no-renames reports a rename as deletion + addition, retaining both
    // endpoints without parsing status scores. -z preserves arbitrary names.
    const diff = run(gitRoot, [
      'diff', '--name-only', '-z', '--no-renames', '--no-ext-diff', '--no-textconv',
      ...(options.staged ? ['--cached'] : [base!]), '--',
    ]);
    const untracked = options.staged ? '' : run(gitRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
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
