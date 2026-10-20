/**
 * Minimal glob semantics for the `paths:` front matter field, shared by
 * `adrkit relevant` (matching) and `validate` (drift checking). Deliberately
 * dependency-free and small: `**` crosses directory separators, `*` stays
 * within one segment, `?` matches exactly one character, and every other
 * byte is literal. No brace expansion and no character classes — a scope
 * that needs them is too clever to verify at a glance.
 */

/** Bytes that are regular-expression syntax unless escaped. */
const REGEX_SPECIALS = new Set(['.', '+', '(', ')', '[', ']', '{', '}', '^', '$', '|', '\\']);

/**
 * Compile a glob to an anchored regular expression. The mapping is one pass:
 * a `**` followed by a separator becomes an optional directory run, so a
 * `*.ts` pattern anchored by `**` matches a root-level file as well as a
 * nested one; a `**` not followed by a separator crosses everything; a lone
 * `*` stays within one segment; `?` matches exactly one character; anything
 * else is escaped literally.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        index += 1;
        if (pattern[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else if (REGEX_SPECIALS.has(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`, 's');
}

/** Whether a glob pattern matches a repository-relative path in full. */
export function globMatches(pattern: string, path: string): boolean {
  // Dot-all preserves newline filenames; the equality check pins the
  // full-path-match contract instead of relying on the anchors alone.
  return globToRegExp(pattern).exec(path)?.[0] === path;
}

/**
 * The existing-path anchor for drift checking: the full path for a literal
 * pattern, or complete directory components before the first wildcard.
 * `src/core/**` yields `src/core`; `src/cli*.ts` yields `src`, not the partial
 * filename `src/cli`. No anchored directory yields the empty string.
 */
export function staticPrefix(pattern: string): string {
  const wildcard = pattern.search(/[*?]/);
  if (wildcard === -1) return pattern.replace(/\/+$/, '');
  const separator = pattern.lastIndexOf('/', wildcard);
  return separator === -1 ? '' : pattern.slice(0, separator).replace(/\/+$/, '');
}
