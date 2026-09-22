import { describe, expect, it } from 'vitest';
import {
  CAMERA_ICON, GITHUB_MARK_PATH, SHARE_BUTTON_HTML, SHARE_SCRIPT, SHARE_STYLE, SHARE_WATERMARK,
} from '../src/core/share.js';

/**
 * Helper names the code calls but never declares — a runtime TypeError the
 * string assertions above cannot see. This is how fitText went missing once.
 * A single scanning pass drops comments and literals, so concatenated strings
 * (the script builds most of its CSS that way) cannot throw the pairing off.
 */
function missingHelpers(code: string): string[] {
  let source = '';
  for (let i = 0; i < code.length;) {
    const ch = code[i]!;
    const next = code[i + 1];
    if (ch === '/' && next === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      i++;
      while (i < code.length && code[i] !== ch) i += code[i] === '\\' ? 2 : 1;
      i++;
      source += '""';
      continue;
    }
    source += ch;
    i++;
  }
  const declared = new Set([...source.matchAll(/function (\w+)\s*\(/g)].map((m) => m[1]!));
  for (const match of source.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    for (const part of match[1]!.split(',')) {
      const name = part.trim().split(/[=:]/)[0]!.trim();
      if (/^\w+$/.test(name)) declared.add(name);
    }
  }
  const globals = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'new', 'typeof', 'return',
    'async', 'await', 'Image', 'Path2D', 'URL', 'Blob', 'Array', 'Map', 'Set', 'String',
    'Number', 'Date', 'Math', 'JSON', 'Object', 'Promise', 'Error', 'XMLSerializer',
    'ClipboardItem', 'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'console',
    'fetch', 'createImageBitmap', 'encodeURIComponent', 'decodeURIComponent', 'isNaN',
    'parseInt', 'getComputedStyle',
  ]);
  const called = new Set<string>();
  for (const match of source.matchAll(/(?<![.\w])(\w+)\s*\(/g)) {
    if (/function\s+$/.test(source.slice(Math.max(0, (match.index ?? 0) - 20), match.index))) continue;
    called.add(match[1]!);
  }
  return [...called].filter((name) => !declared.has(name) && !globals.has(name));
}

describe('share script', () => {
  it('labels the action as saving a picture of the view', () => {
    // A camera, not a share glyph: nothing is sent anywhere, and a download
    // glyph would promise only a file.
    expect(SHARE_BUTTON_HTML).toContain('aria-label="Save as image"');
    expect(SHARE_BUTTON_HTML).toContain('title="Save as image"');
    expect(SHARE_BUTTON_HTML).toContain(CAMERA_ICON);
    expect(SHARE_BUTTON_HTML).not.toContain('>Share<');
    expect(SHARE_BUTTON_HTML).toContain('aria-hidden="true"');
  });

  it('reports through a status line instead of the button label', () => {
    // The button is an icon, so its label cannot carry feedback.
    expect(SHARE_STYLE).toContain('.canvas-toast');
    expect(SHARE_SCRIPT).not.toContain('shareButton.textContent');
    expect(SHARE_SCRIPT).toContain("toast.setAttribute('role', 'status')");
    expect(SHARE_SCRIPT).toContain("toast.setAttribute('aria-live', 'polite')");
    expect(SHARE_SCRIPT).toContain("showToast('Rendering…')");
    expect(SHARE_SCRIPT).toContain("showToast(copied ? 'Saved ' + name + ' · copied to clipboard' : 'Saved ' + name)");
    expect(SHARE_SCRIPT).toContain("showToast('Could not render the image')");
    // It says only what the page can know: a page cannot tell which folder the
    // download reached, so the status line never claims one.
    const messages = SHARE_SCRIPT.match(/showToast\([^)]*\)/g) ?? [];
    expect(messages.join(' ')).not.toMatch(/Desktop|folder|Downloads/);
  });

  it('credits the repository as a logo and a short handle', () => {
    expect(SHARE_WATERMARK).toBe('luochang212/adr-kit');
    expect(SHARE_SCRIPT).toContain('const REPO = \'luochang212/adr-kit\'');
    // A full URL would outweigh the diagram; the credit is the GitHub mark
    // plus the handle, and the mark path is a single source of truth.
    expect(SHARE_SCRIPT).not.toContain('github.com/luochang212');
    expect(SHARE_SCRIPT).toContain(GITHUB_MARK_PATH);
    expect(SHARE_SCRIPT).toContain('new Path2D(GITHUB_MARK)');
  });

  it('says what the image is, since the image travels without the page', () => {
    expect(SHARE_SCRIPT).toContain("isTree ? 'Deliberation tree' : 'Decision map'");
    expect(SHARE_SCRIPT).toContain("document.querySelectorAll('.viewer-stats span')");
    expect(SHARE_SCRIPT).toContain('facts.title');
    expect(SHARE_SCRIPT).toContain('facts.stats');
  });

  it('renders offline: no network, no bundled renderer', () => {
    expect(SHARE_SCRIPT).not.toMatch(/\bfetch\(/);
    expect(SHARE_SCRIPT).not.toMatch(/XMLHttpRequest/);
    expect(SHARE_SCRIPT).not.toMatch(/new WebSocket/);
    expect(SHARE_SCRIPT).toContain('foreignObject');
    expect(SHARE_SCRIPT).toContain('toBlob');
  });

  it('reserves measured heading space above the diagram', () => {
    expect(SHARE_SCRIPT).toContain('heading(ctx, layout);');
    expect(SHARE_SCRIPT).toContain('footer(ctx, W, H);');
    expect(SHARE_SCRIPT).toContain('dy = layout.height');
    expect(SHARE_SCRIPT).toContain('const H = dy + h + GAP + legendHeight + FOOTER_H;');
  });

  it('keeps long and multilingual titles intact and inside the image', () => {
    // Execute the actual layout code, using deterministic font metrics. This
    // checks wrapping and reserved space rather than pinning a font literal.
    const source = SHARE_SCRIPT.slice(SHARE_SCRIPT.indexOf('  function wrapLines'),
      SHARE_SCRIPT.indexOf('  /** A clear reading order'));
    const layout = new Function('ctx', 'W', 'facts',
      "const PAD = 40, SANS = 'sans-serif', GREEN = 'green', INK = 'black', MUTED = 'gray';"
      + source + '; return headingLayout(ctx, W, facts);');
    const ctx = {
      font: '',
      measureText(text: string) {
        return { width: Array.from(text).length * parseFloat(this.font.split(' ')[1]!) * 0.6 };
      },
    };
    for (const width of [460, 1157, 2280]) {
      for (const title of ['Decision map', 'ADR 9: Render the decision graph as an offline HTML map',
        '架构决策记录与可视化'.repeat(8), 'UnbrokenTitle'.repeat(20)]) {
        const facts = { kind: 'Decision map', title, stats: '15 decisions · 23 references · 8 deliberation trees' };
        const result = layout(ctx, width, facts);
        const titles = result.rows.filter((row: { color: string }) => row.color === 'black');
        expect(titles.map((row: { text: string }) => row.text).join('').replace(/\s/g, ''))
          .toBe(title.replace(/\s/g, ''));
        for (const row of result.rows) {
          ctx.font = row.font;
          expect(ctx.measureText(row.text).width).toBeLessThanOrEqual(width - 80);
          expect(row.y + parseFloat(row.font.split(' ')[1])).toBeLessThan(result.height);
        }
        expect(result.rows[0].text).toMatch(title === 'Decision map' ? /^Decision map$/ : /^DECISION MAP/);
      }
    }
    const tree = layout(ctx, 460, { kind: 'ADR 9 · Deliberation tree', title: 'A choice', stats: '' });
    expect(tree.rows[0].text).toBe('ADR 9 · DELIBERATION TREE');
    const map = layout(ctx, 460, { kind: 'Decision map', title: 'Decision map', stats: '' });
    expect(map.rows).toHaveLength(1);
    expect(map.rows[0].y).toBe(tree.rows[0].y);
    expect(map.height).toBeLessThan(tree.height);
    expect(tree.rows.some((row: { color: string }) => row.color === 'gray')).toBe(false);
  });

  it('exports only legend entries whose marks remain in the visible tree', () => {
    const source = SHARE_SCRIPT.slice(SHARE_SCRIPT.indexOf('  function legendEntries'),
      SHARE_SCRIPT.indexOf('  async function legendImage'));
    const entries = new Function('document', source + '; return legendEntries();');
    const selected = { dataset: { shareSelector: '.visible-answer' } };
    const hidden = { dataset: { shareSelector: '.hidden-chip' } };
    const map = { dataset: {} };
    const document = {
      querySelectorAll: () => [selected, hidden, map],
      querySelector: (selector: string) => selector === '.visible-answer' ? {} : null,
    };
    expect(entries(document)).toEqual([selected, map]);
    document.querySelectorAll = () => [];
    expect(entries(document)).toEqual([]);
  });

  it('removes disclosure glyphs only from the rasterized tree copy', () => {
    const tree = SHARE_SCRIPT.slice(SHARE_SCRIPT.indexOf('  function treeImage'),
      SHARE_SCRIPT.indexOf('  function htmlImage'));
    expect(tree).toContain("cloneNode(true)");
    expect(tree).toContain('.alts summary::after,.alts summary::marker{content:none}');
    // The count and currently expanded options remain in the clone.
    expect(tree).not.toContain("querySelectorAll('.alts')");
    expect(tree).not.toContain("removeAttribute('open')");
    expect(SHARE_STYLE).not.toContain('summary');
  });

  it('calls only helpers the script declares', () => {
    expect(missingHelpers(SHARE_SCRIPT)).toEqual([]);
    // And the check has teeth: a call left behind by a renamed helper is
    // reported rather than silently passing.
    expect(missingHelpers(SHARE_SCRIPT.replace('function fitText', 'function fitTextMoved')))
      .toEqual(['fitText']);
  });

  it('saves a download and copies when the clipboard allows it', () => {
    expect(SHARE_SCRIPT).toContain('link.download');
    expect(SHARE_SCRIPT).toContain('navigator.clipboard.write');
  });
});
