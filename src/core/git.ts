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
