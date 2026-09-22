/**
 * Text helpers shared by the rendered views: the SVG decision map, the card
 * tree, and Mermaid labels. One implementation keeps escaping and wrapping
 * identical wherever record text reaches a view.
 */

/** Escape text for insertion into HTML or SVG character data. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * East Asian wide and fullwidth ranges. They occupy two columns, so counting
 * code points alone would let a Chinese or Japanese title overflow a card that
 * holds thirty Latin characters.
 */
const WIDE = /[\u1100-\u115f\u2e80-\u303f\u3040-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;

function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += WIDE.test(char) ? 2 : 1;
  return width;
}

/** Advance width per character, in em, as the views budget their fixed-width text. */
const LATIN_EM = 0.48;
const WIDE_EM = 1.03;

/**
 * Advance width of `text` at `fontSize`, for the SVG views, which get no
 * wrapping or clipping from the browser and must size a run before writing it.
 * The faces these views resolve to measure a little narrower, so a caller that
 * clips to the same budget cannot be caught out by its own rounding.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const char of text) em += WIDE.test(char) ? WIDE_EM : LATIN_EM;
  return em * fontSize;
}

function splitByWidth(word: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  let width = 0;
  for (const char of word) {
    const charWidth = WIDE.test(char) ? 2 : 1;
    if (piece.length > 0 && width + charWidth > maxWidth) {
      pieces.push(piece);
      piece = '';
      width = 0;
    }
    piece += char;
    width += charWidth;
  }
  if (piece.length > 0) pieces.push(piece);
  return pieces;
}

/**
 * Wrap text to roughly `maxWidth` columns on word boundaries. A run with no
 * break opportunity — Chinese text, a long URL — is split by width instead of
 * overflowing the view. Returns at least one line.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  const flush = (): void => {
    if (current.length > 0) {
      lines.push(current);
      current = '';
    }
  };
  for (const word of text.split(/\s+/).filter((candidate) => candidate.length > 0)) {
    if (displayWidth(word) > maxWidth) {
      flush();
      lines.push(...splitByWidth(word, maxWidth));
      continue;
    }
    if (current === '') current = word;
    else if (displayWidth(current) + 1 + displayWidth(word) > maxWidth) {
      flush();
      current = word;
    } else current = current + ' ' + word;
  }
  flush();
  return lines.length > 0 ? lines : [''];
}
