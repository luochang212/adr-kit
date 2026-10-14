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
 * The literal part of a glob: everything before the first wildcard, with a
 * trailing separator stripped. `src/core/**` yields `src/core`, the path
 * `validate` requires to exist; a pattern with no literal head yields the
 * empty string, which cannot be checked and is skipped.
 */
export function staticPrefix(pattern: string): string {
  const wildcard = pattern.search(/[*?]/);
  const head = wildcard === -1 ? pattern : pattern.slice(0, wildcard);
  return head.replace(/\/+$/, '');
}
