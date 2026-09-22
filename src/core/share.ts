/**
 * The Save-as-image action: renders the current view into a branded,
 * self-contained PNG entirely on the client — serializes the diagram,
 * rasterizes it, and composes the frame around it. No network, no third-party
 * renderer, no runtime dependency (ADR 8/9): the only inputs are the live DOM
 * and the page's own stylesheet text. Nothing is uploaded, and the browser
 * decides where the download lands: a page cannot write to a chosen folder.
 */

/** The credit line every shared image carries. */
export const SHARE_WATERMARK = 'luochang212/adr-kit';

/**
 * The button is a camera, because that is what it does: it makes a picture of
 * the view. A share glyph would promise sending it somewhere, a download glyph
 * would promise only a file, and neither is what happens.
 *
 * The glyph is Lucide's `camera` (ISC), the same icon skill-zoo uses, at 24
 * units in a 24 box and stroke 2 — 1.33px on screen at 16px, matching the
 * Info glyph's 1.4.
 */
export const CAMERA_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>'
  + '<circle cx="12" cy="13" r="3"/>'
  + '</svg>';

export const SHARE_BUTTON_HTML = '<button id="share" class="js-control" aria-label="Save as image" title="Save as image">'
  + CAMERA_ICON + '</button>';

/**
 * The button carries no text, so its feedback is a status line: what was saved,
 * whether the copy worked, and nothing it cannot know (a page cannot tell which
 * folder the download reached).
 */
export const SHARE_STYLE = String.raw`
.canvas-toast { position: fixed; left: 50%; bottom: 96px; z-index: 6; max-width: min(520px, calc(100vw - 32px)); padding: 9px 14px; background: #233c36; color: #fff; border-radius: 9px; font-size: 12px; line-height: 1.45; text-align: center; box-shadow: 0 8px 24px #233c3626; opacity: 0; transform: translate(-50%,8px); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
.canvas-toast.visible { opacity: 1; transform: translate(-50%,0); }
`;

// GitHub's mark-github octicon, a 16x16 path, drawn with Path2D. The credit
// is a logo and a short handle: a full URL would outweigh the diagram.
export const GITHUB_MARK_PATH =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49'
  + '-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66'
  + '.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27'
  + 's1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48'
  + ' 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z';

// Kept as readable JavaScript: tsc ships this string unchanged in the CLI bundle.
// All record text is server-escaped HTML, never interpolated into this program.
export const SHARE_SCRIPT = String.raw`
(() => {
  const shareButton = document.getElementById('share');
  if (!shareButton) return;
  const REPO = '${SHARE_WATERMARK}';
  const INK = '#233c36', MUTED = '#64756c', GREEN = '#294d3e', PAPER = '#f6f8f5', DOT = '#cdd8cc', LINE = '#dce4dc';
  const HAIRLINE = '#e4eae4', TINT = 'rgba(41,77,62,.07)';
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const GITHUB_MARK = '${GITHUB_MARK_PATH}';
  // The composed canvas is drawn at 2x so shared images stay crisp. The frame
  // follows the diagram: the heading, the diagram, then the one-line footer,
  // which is the shape's own bottom edge.
  const SCALE = 2, PAD = 40, GAP = 24, FOOTER_H = 56, RADIUS = 20, MIN_W = 460;
  const MAX_W = 2200, MAX_H = 4000;

  // The status line. role=status + aria-live announce it to screen readers as
  // well, and the text is cleared on hide so a repeated message still speaks.
  const toast = document.createElement('div');
  toast.className = 'canvas-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer = 0;
  function showToast(message) {
    const dock = document.querySelector('.canvas-dock');
    toast.style.bottom = ((dock ? dock.offsetHeight : 0) + 22) + 'px';
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      toast.textContent = '';
    }, 2600);
  }

  function diagramSize() {
    const world = document.getElementById('world');
    return { w: world.offsetWidth || world.scrollWidth, h: world.offsetHeight || world.scrollHeight };
  }

  /**
   * What the image is: the view's kind, its title, and its own statistics, all
   * read off the page the reader is looking at. Shared images travel without
   * the page, so they have to say it themselves.
   */
  function shareFacts() {
    const heading = document.querySelector('.viewer-heading h1');
    const title = ((heading && heading.textContent) || document.title || 'ADR Kit').trim();
    const isTree = !!document.getElementById('edges');
    const stats = Array.from(document.querySelectorAll('.viewer-stats span'))
      .map(span => Array.from(span.childNodes).map(node => node.textContent || '').join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' · ');
    const kind = isTree ? 'Deliberation tree' : 'Decision map';
    const numbered = isTree && title.match(/^(\d+)\s+(.+)$/s);
    return {
      kind: numbered ? 'ADR ' + numbered[1] + ' · ' + kind : kind,
      title: numbered ? numbered[2] : title,
      stats,
    };
  }

  function pageCss() {
    return Array.from(document.querySelectorAll('style')).map(style => style.textContent).join('\n');
  }

  function imageFrom(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('diagram raster failed'));
      img.src = src;
    });
  }

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  }

  // The embedded page CSS paints an opaque :root background; the composed
  // dot grid is the canvas, so the diagram must stay transparent over it.
  const TRANSPARENT_ROOT = ' :root{background:transparent}';

  // The map is already one SVG: serialize it with the page styles embedded so
  // the detached copy keeps its look. Width and height scale the whole
  // viewBox, which keeps the geometry and the aspect ratio intact.
  function mapImage(w, h) {
    const svg = document.querySelector('#world svg').cloneNode(true);
    svg.querySelectorAll('.relation-dim').forEach(node => node.classList.remove('relation-dim'));
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = pageCss() + TRANSPARENT_ROOT;
    svg.insertBefore(style, svg.firstChild);
    return imageFrom(svgDataUrl(svg));
  }

  // The tree is HTML cards, so the laid-out world goes into a foreignObject
  // and the browser rasterizes it. The shell keeps the interactive class so
  // the absolute card layout still matches, and the clone is scaled by the
  // export factor; collapsed branches stay collapsed and the fold buttons
  // come off the copy.
  function treeImage(w, h, factor) {
    const clone = document.getElementById('world').cloneNode(true);
    clone.querySelectorAll('.relation-dim').forEach(node => node.classList.remove('relation-dim'));
    clone.removeAttribute('id');
    clone.style.position = 'absolute';
    clone.style.left = '0px';
    clone.style.top = '0px';
    clone.style.transformOrigin = '0 0';
    clone.style.transform = 'scale(' + factor + ')';
    clone.querySelectorAll('.branch').forEach(button => button.remove());
    const shell = document.createElement('div');
    shell.className = 'interactive';
    shell.style.cssText = 'width:' + w + 'px;height:' + h + 'px;position:relative;overflow:hidden;background:transparent;';
    const style = document.createElement('style');
    style.textContent = pageCss() + TRANSPARENT_ROOT + ' .branch{display:none} .alts summary::after,.alts summary::marker{content:none}';
    shell.appendChild(style);
    shell.appendChild(clone);
    return htmlImage(shell, w, h);
  }

  function htmlImage(shell, w, h) {
    const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreign.setAttribute('width', w);
    foreign.setAttribute('height', h);
    foreign.appendChild(shell);
    const frame = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    frame.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    frame.setAttribute('width', w);
    frame.setAttribute('height', h);
    frame.appendChild(foreign);
    return imageFrom(svgDataUrl(frame));
  }

  // Reuse the page's symbols and wording. A folded tree may no longer show
  // every mark in its original legend; selectors refer to the actual drawing.
  function legendEntries() {
    return Array.from(document.querySelectorAll('.canvas-legend .legend > span'))
      .filter(entry => !entry.dataset.shareSelector || document.querySelector(entry.dataset.shareSelector));
  }

  async function legendImage(W) {
    const entries = legendEntries();
    if (!entries.length) return null;
    const shell = document.createElement('div');
    shell.className = 'canvas-legend share-legend';
    const width = W - PAD * 2;
    const style = document.createElement('style');
    style.textContent = pageCss() + TRANSPARENT_ROOT
      + ' .share-legend{display:block;box-sizing:border-box;width:' + width + 'px;max-width:none;'
      + 'padding:0;border:0;border-radius:0;box-shadow:none;background:transparent;font:14px/1.5 ' + SANS + ';}'
      + ' .share-legend .legend{gap:12px 24px;} .share-legend .legend>span{max-width:100%;}'
      + ' .share-legend .legend .state{font-size:12px;} .share-legend i{flex-shrink:0;}';
    shell.appendChild(style);
    const legend = document.createElement('div');
    legend.className = 'legend';
    entries.forEach(entry => legend.appendChild(entry.cloneNode(true)));
    shell.appendChild(legend);
    shell.style.cssText = 'position:fixed;left:-10000px;top:0;';
    document.body.appendChild(shell);
    let height;
    try {
      height = Math.ceil(shell.getBoundingClientRect().height);
    } finally {
      shell.remove();
    }
    shell.style.cssText = 'transform-origin:0 0;transform:scale(' + SCALE + ');';
    return { image: await htmlImage(shell, width * SCALE, height * SCALE), height };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Cut text to the room it has, marking what was left out with an ellipsis. */
  function fitText(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(cut + '…').width > max) cut = cut.slice(0, -1);
    return cut + '…';
  }

  function fileName() {
    const slug = shareFacts().title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return (slug || 'adr-kit') + '-' + new Date().toISOString().slice(0, 10) + '.png';
  }

  /** Wrap measured text, including titles without spaces, without losing it. */
  function wrapLines(ctx, text, width) {
    const lines = [];
    let line = '';
    for (const word of text.match(/\S+\s*/g) || []) {
      if (line && ctx.measureText((line + word).trimEnd()).width > width) {
        lines.push(line.trimEnd());
        line = '';
      }
      for (const char of Array.from(word)) {
        if (line && ctx.measureText((line + char).trimEnd()).width > width) {
          lines.push(line.trimEnd());
          line = '';
        }
        line += char;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    return lines;
  }

  // Size the typography for the exported sheet, independent of browser zoom.
  // Measuring first reserves real space for long titles and wrapped statistics.
  function headingLayout(ctx, W, facts) {
    const unit = Math.max(1, Math.min(2, W / 1000));
    const width = W - PAD * 2;
    const same = facts.title.toLowerCase() === facts.kind.toLowerCase();
    const rows = [];
    let y = 32 * unit;
    function block(text, size, weight, color, leading) {
      const font = weight + ' ' + size * unit + 'px ' + SANS;
      ctx.font = font;
      for (const textLine of wrapLines(ctx, text, width)) {
        rows.push({ text: textLine, font, color, y });
        y += leading * unit;
      }
    }
    if (!same) {
      block(facts.kind.toUpperCase(), 13, 600, GREEN, 18);
      y += 10 * unit;
    }
    block(facts.title, 32, 700, INK, 40);
    if (facts.stats) {
      y += 12 * unit;
      block(facts.stats, 15, 500, MUTED, 23);
    }
    return { rows, height: Math.ceil(y + 28 * unit) };
  }

  /** A clear reading order: category, full title, then supporting facts. */
  function heading(ctx, layout) {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (const row of layout.rows) {
      ctx.font = row.font;
      ctx.fillStyle = row.color;
      ctx.fillText(row.text, PAD, row.y);
    }
  }

  /**
   * The footer is part of the canvas rather than a slab on top of it: a light
   * tint, closed by a hairline, sitting flush on
   * the bottom edge. One line: who made it, and when.
   */
  function footer(ctx, W, H) {
    const top = H - FOOTER_H;
    ctx.save();
    roundRect(ctx, 0, 0, W, H, RADIUS);
    ctx.clip();
    ctx.fillStyle = TINT;
    ctx.fillRect(0, top, W, FOOTER_H);
    ctx.restore();
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, top + 0.5);
    ctx.lineTo(W, top + 0.5);
    ctx.stroke();

    const line = top + FOOTER_H / 2;
    ctx.textBaseline = 'middle';
    // The credit: the GitHub mark in the accent, then the handle.
    const mark = 18;
    ctx.save();
    ctx.translate(PAD, line - mark / 2);
    ctx.scale(mark / 16, mark / 16);
    ctx.fillStyle = GREEN;
    ctx.fill(new Path2D(GITHUB_MARK));
    ctx.restore();
    ctx.font = '600 14px ' + SANS;
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, REPO, W - PAD * 2 - mark - 110), PAD + mark + 8, line);
    ctx.font = '500 13px ' + SANS;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toISOString().slice(0, 10), W - PAD, line);
    ctx.textAlign = 'left';
  }

  async function renderShare() {
    const size = diagramSize();
    const s = Math.min(1, MAX_W / size.w, MAX_H / size.h);
    const w = Math.round(size.w * s), h = Math.round(size.h * s);
    // The frame hugs the diagram; only a very narrow one widens to keep the
    // footer text readable.
    const W = Math.max(w + PAD * 2, MIN_W);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const facts = shareFacts();
    const layout = headingLayout(ctx, W, facts);
    const dx = Math.round((W - w) / 2), dy = layout.height;
    const legend = await legendImage(W);
    const legendHeight = legend ? legend.height + GAP : 0;
    const H = dy + h + GAP + legendHeight + FOOTER_H;
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.scale(SCALE, SCALE);
    // The canvas itself: a rounded paper card, dotted like the live view. The
    // heading stays clear of dots so small supporting text stays legible.
    roundRect(ctx, 0, 0, W, H, RADIUS);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = DOT;
    for (let gx = 10; gx <= W - 10; gx += 20) {
      for (let gy = dy; gy < dy + h; gy += 20) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.9, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
    const isTree = !!document.getElementById('edges');
    const img = await (isTree
      ? treeImage(w * SCALE, h * SCALE, s * SCALE)
      : mapImage(w * SCALE, h * SCALE));
    ctx.drawImage(img, dx, dy, w, h);
    if (legend) ctx.drawImage(legend.image, PAD, dy + h + GAP, W - PAD * 2, legend.height);
    heading(ctx, layout);
    footer(ctx, W, H);
    // The card's hairline goes last, so it reads as one edge around both zones.
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, RADIUS);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.stroke();
    return new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('png encode failed')), 'image/png'));
  }

  shareButton.addEventListener('click', async () => {
    shareButton.disabled = true;
    showToast('Rendering…');
    try {
      const blob = await renderShare();
      const name = fileName();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      let copied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copied = true;
      } catch (e) {}
      // Only what the page can know: the name it handed over, and whether the
      // clipboard took a copy. Where the download landed is the browser's call.
      showToast(copied ? 'Saved ' + name + ' · copied to clipboard' : 'Saved ' + name);
    } catch (e) {
      showToast('Could not render the image');
      if (window.console) console.error('adr-kit: share render failed', e);
    }
    shareButton.disabled = false;
  });
})();
`;
