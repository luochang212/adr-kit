import { escapeHtml } from './view-text.js';
import { GITHUB_MARK_PATH, SHARE_BUTTON_HTML, SHARE_WATERMARK } from './share.js';

/** Derived from the credit line, so the link and the image cannot drift apart. */
const REPOSITORY_URL = 'https://github.com/' + SHARE_WATERMARK;

/**
 * The GitHub mark beside the wordmark — the same glyph the shared image
 * credits with, filled rather than stroked because it is a logo here, and it
 * inherits the link's colour so hover reaches it too.
 */
const BRAND_MARK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">'
  + '<path d="' + GITHUB_MARK_PATH + '" fill="currentColor"/></svg>';

/** Shared compact shell for both offline viewers. */
export const CANVAS_STYLE = String.raw`
:root { font-family: Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #233c36; background: #f6f8f5; }
* { box-sizing: border-box; }
body { margin: 0; }
main { position: relative; }
button, summary { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, summary:focus-visible, main:focus-visible, a:focus-visible { outline: 2px solid #7750a5; outline-offset: -2px; }
.viewer-bar { position: relative; z-index: 5; display: flex; align-items: center; gap: 16px; padding: 8px 16px; min-height: 52px; background: #fff; border-bottom: 1px solid #e1e7e1; }
.viewer-heading { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.viewer-brand { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 650; white-space: nowrap; padding-right: 12px; border-right: 1px solid #dce4dc; color: inherit; text-decoration: none; }
.viewer-brand svg { display: block; }
.viewer-brand:hover { color: #294d3e; text-decoration: underline; text-decoration-color: #a6bcae; text-underline-offset: 2px; }
.viewer-heading h1 { margin: 0; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.viewer-count { flex: none; font-size: 12px; color: #64756c; }
.viewer-sep { flex: none; width: 1px; height: 18px; background: #dce4dc; }
.viewer-actions { display: flex; align-items: center; gap: 10px; flex: none; }
/* The controls are icon buttons: square, and close enough together to read as
   one cluster while the count and the divider keep their distance. */
.viewer-tools { display: flex; align-items: center; gap: 4px; }
.viewer-bar button, .viewer-info > summary { border: 0; border-radius: 7px; background: transparent; padding: 7px; font-size: 12px; line-height: 20px; white-space: nowrap; }
.viewer-bar button:hover, .viewer-info > summary:hover, .viewer-info[open] > summary { background: #edf3ef; }
.viewer-info > summary { list-style: none; }
.viewer-info > summary::-webkit-details-marker { display: none; }
/* Toolbar icons sit on their own line: an inline SVG adds the font's descender
   space below it, which lifts the icon out of line with its neighbour. This
   belongs to the shared shell, or one view aligns and the other does not. */
.viewer-bar button svg, .viewer-bar summary svg { display: block; }
.viewer-panel { position: absolute; right: 12px; top: calc(100% + 8px); width: min(360px, calc(100vw - 24px)); max-height: calc(100vh - 120px); max-height: calc(100dvh - 120px); overflow: auto; overscroll-behavior: contain; padding: 20px; background: #fff; border: 1px solid #dce4dc; border-radius: 12px; box-shadow: 0 12px 36px #233c3620; font-size: 12px; line-height: 1.6; }
.viewer-panel h2 { margin: 0 0 10px; font-size: 15px; overflow-wrap: anywhere; }
.viewer-panel p { margin: 10px 0; color: #64756c; }
.viewer-stats { display: flex; gap: 8px 16px; flex-wrap: wrap; margin: 16px 0 0; }
.viewer-stats strong { margin-right: 4px; }
.canvas-dock { position: absolute; z-index: 4; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; pointer-events: none; }
.canvas-dock > * { pointer-events: auto; }
/* Without the script there is no floating canvas: the dock sits at the end of the content. */
body:not(.interactive) main { padding-bottom: 84px; }
.canvas-legend { display: grid; gap: 6px; min-width: 0; max-width: min(620px, 100%); padding: 10px 12px; background: #ffffffe8; border: 1px solid #e1e7e1; border-radius: 10px; box-shadow: 0 4px 20px #294d3e0a; font-size: 11px; color: #55655c; }
.canvas-legend .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.canvas-legend .legend span { display: flex; align-items: center; gap: 8px; }
.viewer-panel .hint { border-top: 1px solid #e1e7e1; padding-top: 14px; margin: 16px 0 0; }
.controls { display: none; align-items: center; gap: 2px; padding: 5px; background: #fff; border: 1px solid #dce4dc; border-radius: 11px; box-shadow: 0 4px 20px #294d3e0a; }
.controls button { border: 0; background: none; font: inherit; color: inherit; cursor: pointer; padding: 6px 9px; border-radius: 7px; }
.controls button:hover { background: #edf3ef; }
.controls output { font: 11px monospace; min-width: 44px; text-align: center; }
.js-control { display: none; }
body.interactive { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
.interactive .viewer-bar { flex: none; }
.interactive main { flex: 1; min-width: 0; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; user-select: none; }
.interactive #world { position: absolute; }
.interactive .js-control { display: block; }
.interactive .controls { display: flex; }
.interactive main.dragging { cursor: grabbing; }
@media (max-width: 760px) {
  .viewer-bar { flex-wrap: wrap; gap: 4px 12px; padding: 6px 10px; }
  .viewer-heading { flex-basis: 100%; min-height: 28px; }
  .viewer-actions { width: 100%; justify-content: flex-end; }
  .viewer-count { margin-right: auto; }
  .viewer-panel { right: 10px; }
  .canvas-legend { max-width: 100%; }
}
/* Below the count's breakpoint the row it sat on would hold two icons and
   nothing else, so the bar goes back to one line and keeps its height for the
   canvas. The brand gives up its room to the title, which needs it more. */
@media (max-width: 480px) {
  .viewer-count, .viewer-sep, .viewer-brand { display: none; }
  /* flex-basis 0, not auto: an auto basis measures the whole title, which no
     row can hold, so the bar would wrap back into two lines. */
  .viewer-heading { flex-basis: 0; }
  .viewer-actions { width: auto; }
}
@media (pointer: coarse) {
  .viewer-bar button, .viewer-info > summary { min-height: 44px; min-width: 44px; }
}
`;

/**
 * The Info disclosure is icon-only: the word carried no information of its
 * own, and the glyph is unambiguous. The label keeps it accessible, and the
 * separator sets the read-only count apart from the controls.
 */
const INFO_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
  + '<circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
  + '<circle cx="8" cy="5.1" r=".95" fill="currentColor"/>'
  + '<path d="M8 7.4v4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

/**
 * The compact toolbar: brand, title, one headline count, and the controls —
 * the Info disclosure and the Save-as-image camera, as one cluster. The canvas
 * dock keeps the gesture controls. A statistic is listed only when its count is
 * non-zero: a zero names something the view does not contain, which sends the
 * reader looking for it.
 */
export function canvasHeaderHTML(title: string, stats: Array<[string, number]>, description: string): string {
  const listed = stats.filter(([, value]) => value !== 0);
  const first = listed[0];
  return '<header class="viewer-bar">'
    + '<div class="viewer-heading"><a class="viewer-brand" href="' + REPOSITORY_URL + '" target="_blank" rel="noopener noreferrer" title="' + SHARE_WATERMARK + ' on GitHub">' + BRAND_MARK + 'ADR Kit</a><h1>' + escapeHtml(title) + '</h1></div>'
    + '<div class="viewer-actions"><span class="viewer-count">' + (first ? first[1] + ' ' + escapeHtml(first[0]) : '') + '</span>'
    + '<span class="viewer-sep" aria-hidden="true"></span>'
    + '<div class="viewer-tools">'
    + '<details class="viewer-info"><summary aria-label="View information" title="View information">' + INFO_ICON + '</summary><section class="viewer-panel" aria-label="View information">'
    + '<h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(description) + '</p>'
    + '<div class="viewer-stats">' + listed.map(([label, value]) => '<span><strong>' + value + '</strong>' + escapeHtml(label) + '</span>').join('') + '</div>'
    + '<p id="instructions" class="hint">' + CANVAS_HINT + '</p>'
    + '</section></details>'
    + SHARE_BUTTON_HTML
    + '</div>'
    + '</div></header>';
}

/**
 * The canvas dock: the legend over the bottom-left corner, the zoom cluster
 * over the bottom-right. Both float above the canvas, so the header can stay
 * compact without hiding what the picture means. A view with nothing to key
 * draws no legend panel rather than an empty one.
 */
export function canvasDockHTML(legend: string, fitLabel: string): string {
  return '<div class="canvas-dock">'
    + (legend === '' ? '' : '<section class="canvas-legend" aria-label="Legend"><div class="legend">' + legend + '</div></section>')
    + canvasControlsHTML(fitLabel)
    + '</div>';
}

/** Shared pan/zoom controller for the offline HTML views. */
export const CANVAS_SCRIPT = String.raw`

(() => {
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  if (!viewport || !world) return;
  document.body.classList.add('interactive');
  const info = document.querySelector('.viewer-info');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && info && info.open) {
      info.open = false;
      info.querySelector('summary').focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (info && info.open && !info.contains(event.target)) info.open = false;
  });
  let scale = 1, tx = 0, ty = 0, frame = 0;

  function paint() {
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    const zoom = document.getElementById('zoom');
    if (zoom) zoom.value = Math.round(scale * 100) + '%';
  }
  /** Overview: the whole diagram inside the viewport, behind the Fit control. */
  function fit() {
    const width = world.offsetWidth, height = world.offsetHeight;
    if (!width || !height) return;
    // Fit above the dock so no card hides behind the legend panel.
    const dock = viewport.querySelector('.canvas-dock');
    const padY = 48 + (dock ? dock.offsetHeight : 0);
    scale = Math.max(.01, Math.min(1, (viewport.clientWidth - 48) / width, (viewport.clientHeight - padY) / height));
    tx = (viewport.clientWidth - width * scale) / 2;
    ty = (viewport.clientHeight - height * scale) / 2;
    paint();
  }
  /**
   * The view a diagram opens in: readable first. Fit the width and never past
   * 1:1, so a tall tree runs past the fold and pans instead of shrinking to a
   * thumbnail whose text cannot be read. Fit is still the overview.
   */
  function fitWidth() {
    const width = world.offsetWidth, height = world.offsetHeight;
    if (!width || !height) return;
    scale = Math.max(.01, Math.min(1, (viewport.clientWidth - 48) / width));
    tx = (viewport.clientWidth - width * scale) / 2;
    const dock = viewport.querySelector('.canvas-dock');
    const room = viewport.clientHeight - 48 - (dock ? dock.offsetHeight : 0);
    ty = height * scale <= room ? (viewport.clientHeight - height * scale) / 2 : 24;
    paint();
  }
  function zoomAt(factor, clientX, clientY) {
    const next = Math.max(Math.min(scale, .05), Math.min(2, scale * factor));
    const rect = viewport.getBoundingClientRect();
    const x = clientX === undefined ? viewport.clientWidth / 2 : clientX - rect.left;
    const y = clientY === undefined ? viewport.clientHeight / 2 : clientY - rect.top;
    tx = x - (x - tx) * next / scale;
    ty = y - (y - ty) * next / scale;
    scale = next;
    paint();
  }
  function zoom(factor) { zoomAt(factor); }
  function addPan(dx, dy) { tx += dx; ty += dy; paint(); }
  function relayout() { if (typeof window.__adrCanvasLayout === 'function') window.__adrCanvasLayout(); }
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; relayout(); });
  }

  const plus = document.getElementById('plus');
  const minus = document.getElementById('minus');
  const fitButton = document.getElementById('fit');
  const reset = document.getElementById('reset');
  if (plus) plus.addEventListener('click', () => zoom(1.2));
  if (minus) minus.addEventListener('click', () => zoom(1 / 1.2));
  if (fitButton) fitButton.addEventListener('click', fit);
  if (reset) reset.addEventListener('click', () => zoom(1 / scale));

  let drag = null;
  let panned = false;
  // A press that moves pans; a press that stays is a click. The slop
  // threshold is what lets links live inside the canvas: pointer capture
  // would retarget their click, so capture waits until the gesture has
  // committed to being a pan.
  const CLICK_SLOP = 4;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    // Real controls keep their native press behavior: with pointer capture
    // their click would land on the viewport and never reach them.
    if (event.target.closest('button, summary, input, select, textarea, .controls, .canvas-legend')) return;
    panned = false;
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) < CLICK_SLOP) return;
      drag.moved = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('dragging');
    }
    tx += event.clientX - drag.x;
    ty += event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    paint();
  });
  viewport.addEventListener('pointerup', event => {
    panned = drag !== null && drag.moved && drag.id === event.pointerId;
    drag = null;
    viewport.classList.remove('dragging');
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    viewport.addEventListener(name, () => { drag = null; viewport.classList.remove('dragging'); });
  }
  // The pan must not also open the link it started on, and a native link
  // drag would cancel the pointer gesture outright.
  viewport.addEventListener('click', event => {
    if (!panned) return;
    panned = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  viewport.addEventListener('dragstart', event => { if (drag) event.preventDefault(); });
  // A trackpad pinch arrives as a ctrlKey wheel event; macOS also reports
  // Command as metaKey. Either one zooms toward the pointer so the point under
  // the cursor stays put (ADR 11), matching the on-screen hint. A plain wheel
  // pans.
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomAt(Math.exp(-event.deltaY / 100), event.clientX, event.clientY);
      return;
    }
    tx -= event.deltaX;
    ty -= event.deltaY;
    paint();
  }, { passive: false });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const actions = {
      ArrowLeft: () => { tx += 50; }, ArrowRight: () => { tx -= 50; },
      ArrowUp: () => { ty += 50; }, ArrowDown: () => { ty -= 50; },
      '+': () => zoom(1.2), '=': () => zoom(1.2), '-': () => zoom(1 / 1.2), '0': fit
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); paint(); }
  });
  viewport.addEventListener('focusin', event => {
    if (!event.target.closest('.card, #world a')) return;
    const target = event.target.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    if (target.left < view.left || target.right > view.right || target.top < view.top || target.bottom > view.bottom) {
      tx += view.left + view.width / 2 - (target.left + target.width / 2);
      ty += view.top + view.height / 2 - (target.top + target.height / 2);
      paint();
    }
  });
  window.addEventListener('resize', () => { relayout(); fitWidth(); });

  window.__adrCanvas = {
    viewport, world,
    get scale() { return scale; },
    paint, fit, fitWidth, zoom, zoomAt, addPan, schedule, relayout
  };

  // Open in the readable view, from the shared controller that owns it: the
  // map has no layout step of its own, so without this it would sit unfitted.
  // The tree's cards are laid out by the script that follows this one, which
  // fits again once they are measured.
  relayout();
  fitWidth();
})();
`;
export const CANVAS_HINT = 'Drag anywhere or scroll to pan · Pinch or Ctrl/⌘ + scroll to zoom at the pointer · Arrow keys move · + / − zoom · 0 fits';

function canvasControlsHTML(fitLabel: string): string {
  return '<div class="controls js-control">'
    + '<button id="minus" aria-label="Zoom out">−</button>'
    + '<output id="zoom" aria-label="Zoom level">100%</output>'
    + '<button id="plus" aria-label="Zoom in">+</button>'
    + '<button id="fit" aria-label="' + escapeHtml(fitLabel) + '">Fit</button>'
    + '<button id="reset">1:1</button>'
    + '</div>';
}
