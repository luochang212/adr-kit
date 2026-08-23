import { execFileSync } from 'node:child_process';

function revParseShort(cwd: string): string {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/**
 * The short HEAD commit hash of the repository containing `cwd`, or undefined
 * when git is unavailable, `cwd` is not inside a git repository, or the repo
 * has no commits yet. Silent by design: the commit stamp is an enhancement
 * (it anchors a decision to the code state it was recorded against), never a
 * failure. Callers stamp `commit` into the front matter only when defined.
 * One retry: a transient git failure (loaded CI runners) must not silently
 * drop the stamp when the repo is perfectly healthy.
 */
export function gitHead(cwd: string): string | undefined {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const hash = revParseShort(cwd);
      if (hash.length > 0) return hash;
    } catch {
      // fall through to the retry / undefined
    }
  }
  return undefined;
}
