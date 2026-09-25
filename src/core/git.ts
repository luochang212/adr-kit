import { execFileSync } from 'node:child_process';

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
