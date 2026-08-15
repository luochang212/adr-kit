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
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug.length > 0 ? slug : 'untitled';
}
