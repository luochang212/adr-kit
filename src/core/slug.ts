/**
 * The characters a file-name slug may carry, as a regular-expression class
 * body: ASCII letters and digits, CJK, and the separating dash. The writer
 * below, the numbered file-name pattern in adr.ts, and the proposal file-name
 * check in validate.ts all build their patterns from this one class, so a
 * character added here is produced and accepted everywhere at once.
 */
export const SLUG_CHARACTERS = 'a-z0-9\\u4e00-\\u9fff-';

/**
 * Convert an ADR title into a file-name slug.
 *
 * The slug keeps ASCII letters, digits, and CJK characters so that English
 * and Chinese titles both remain readable in file names. Everything else
 * becomes a single dash, and the result is capped so generated paths stay
 * reasonable on every file system.
 */
export function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/['"`'']/g, '')
    .replace(new RegExp(`[^${SLUG_CHARACTERS}]+`, 'g'), '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug.length > 0 ? slug : 'untitled';
}
