/** Shared pan/zoom controller and canvased markup for the offline HTML views. */
export const CANVAS_SCRIPT = String.raw`

(() => {
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  if (!viewport || !world) return;
  document.body.classList.add('interactive');
  let scale = 1, tx = 0, ty = 0, frame = 0;

  function paint() {
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    const zoom = document.getElementById('zoom');
    if (zoom) zoom.value = Math.round(scale * 100) + '%';
  }
  function fit() {
    const width = world.offsetWidth, height = world.offsetHeight;
    if (!width || !height) return;
    scale = Math.min(1, (viewport.clientWidth - 48) / width, (viewport.clientHeight - 88) / height);
    tx = (viewport.clientWidth - width * scale) / 2;
    ty = Math.max(16, (viewport.clientHeight - height * scale - 45) / 2);
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
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.card, .node, .controls')) return;
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    tx += event.clientX - drag.x;
    ty += event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    paint();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    viewport.addEventListener(name, () => { drag = null; viewport.classList.remove('dragging'); });
  }
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
    if (!event.target.closest('.card')) return;
    const target = event.target.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    if (target.left < view.left || target.right > view.right || target.top < view.top || target.bottom > view.bottom - 70) {
      tx += view.left + view.width / 2 - (target.left + target.width / 2);
      ty += view.top + view.height / 2 - (target.top + target.height / 2);
      paint();
    }
  });
  window.addEventListener('resize', () => { relayout(); fit(); });

  window.__adrCanvas = {
    viewport, world,
    get scale() { return scale; },
    paint, fit, zoom, zoomAt, addPan, schedule, relayout
  };
})();
`;
export const CANVAS_HINT = 'Drag background or scroll to pan · Pinch or Ctrl/⌘ + scroll to zoom at the pointer · Arrow keys move · + / − zoom · 0 fits';
export function canvasControlsHTML(fitLabel: string): string {
  return '<div class="controls js-control">'
    + '<button id="minus" aria-label="Zoom out">−</button>'
    + '<output id="zoom" aria-label="Zoom level">100%</output>'
    + '<button id="plus" aria-label="Zoom in">+</button>'
    + '<button id="fit">' + fitLabel + '</button>'
    + '<button id="reset">1:1</button>'
    + '</div>';
}
