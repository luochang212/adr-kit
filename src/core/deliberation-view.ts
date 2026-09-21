/** Inline assets for the offline tree viewer. No network or runtime dependency. */
export const TREE_STYLE = String.raw`

:root {
  font-family: Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color: #233c36;
  background: #f6f8f5;
  font-synthesis: none
}
* {
  box-sizing: border-box
}
body {
  margin: 0
}
button {
  font: inherit;
  color: inherit
}
button {
  cursor: pointer
}
button:focus-visible,summary:focus-visible,main:focus-visible {
  outline: 3px solid #9775ce;
  outline-offset: 4px
}
button {
  border: 1px solid #dce4dd;
  background: white;
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 12px
}
button:hover {
  background: #edf3ef
}
header {
  height: 72px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-bottom: 1px solid #e1e7e1;
  gap: 15px
}
.brand {
  font-size: 17px;
  font-weight: 750;
  letter-spacing: -.6px;
  display: flex;
  align-items: center;
  gap: 11px
}
.logo {
  background: #284f40;
  color: white;
  border-radius: 8px;
  padding: 7px 9px;
  font-family: monospace
}
.brand small {
  font-size: 11px;
  color: #728079;
  font-weight: 500;
  letter-spacing: 1px;
  margin-left: 16px
}
.intro {
  min-height: 145px;
  padding: 28px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px
}
.eyebrow {
  color: #788b7b;
  letter-spacing: 2px;
  font: 11px monospace;
  margin-bottom: 9px
}
h1 {
  font-size: 25px;
  letter-spacing: -.7px;
  margin: 0;
  font-weight: 650
}
.intro p {
  font-size: 12px;
  color: #718078;
  margin: 10px 0 0
}
.stats {
  display: flex;
  gap: 24px;
  text-align: center
}
.stats strong {
  font-size: 24px;
  font-weight: 500;
  display: block
}
.stats span {
  font-size: 11px;
  color: #7c8880;
  display: block;
  margin-top: 4px
}
main {
  position: relative;
  height: calc(100dvh - 251px);
  min-height: 420px;
  overflow: hidden;
  touch-action: none;
  background-image: radial-gradient(#cdd8cc .8px,transparent .8px);
  background-size: 20px 20px;
  border-block: 1px solid #e0e7df;
  cursor: grab
}
main.dragging {
  cursor: grabbing
}
#world {
  position: absolute;
  transform-origin: 0 0
}
#edges {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none
}
.card {
  width: 292px;
  background: #fff;
  border: 1px solid #dce4dc;
  border-radius: 13px;
  box-shadow: 0 3px 8px #25403506;
  cursor: auto;
  overflow: visible
}
.card:hover {
  border-color: #a6bcae
}
.cardhead {
  padding: 19px 20px 15px
}
.label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: #78877e;
  letter-spacing: 1px;
  margin-bottom: 12px
}
.state {
  color: #387456;
  letter-spacing: 0;
  background: #edf6ef;
  border-radius: 4px;
  padding: 3px 6px
}
.card h2 {
  font-size: 16px;
  line-height: 1.45;
  letter-spacing: -.25px;
  margin: 0;
  font-weight: 600
}
.answer {
  margin: 0 13px 13px;
  padding: 13px;
  background: #f1f7f1;
  border: 1px solid #e2ece1;
  border-radius: 8px;
  position: relative
}
.answer p {
  font-size: 13px;
  line-height: 1.5;
  margin: 8px 0 0
}
.badge {
  font-size: 10px;
  color: #407455
}
.answer .reason {
  font-size: 11px;
  color: #748576;
  line-height: 1.55
}
.override {
  background: #f4effb;
  color: #7750a5;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  letter-spacing: 0
}
.alts {
  border-top: 1px solid #e7ece6;
  padding: 12px 20px;
  color: #748078;
  font-size: 11px
}
.alts summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between
}
.alts summary:after {
  content: '+';
  font-size: 15px
}
.alts[open] summary:after {
  content: '−'
}
.alt {
  padding-top: 15px;
  margin-top: 12px;
  border-top: 1px solid #eef0ed;
  line-height: 1.55;
  font-size: 12px;
  color: #59645d
}
.alt p {
  margin: 5px 0;
  font-size: 11px;
  color: #788279
}
.root {
  background: #294d3e;
  border-color: #294d3e;
  color: #fff;
  width: 245px
}
.root .cardhead {
  padding: 25px
}
.root .label {
  color: #bacdbc
}
.root h2 {
  font-size: 21px;
  font-weight: 500;
  line-height: 1.4
}
.branch {
  position: absolute;
  right: -13px;
  bottom: 25px;
  padding: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  color: #5a7d64;
  font-size: 15px;
  box-shadow: 0 2px 5px #274b3910;
  z-index: 2
}
.controls {
  position: absolute;
  bottom: 22px;
  right: 24px;
  display: flex;
  align-items: center;
  padding: 5px;
  gap: 3px;
  background: white;
  border: 1px solid #dce4dc;
  border-radius: 11px;
  box-shadow: 0 4px 20px #294d3e0a
}
.controls button {
  border: 0
}
.controls output {
  font: 11px monospace;
  width: 44px;
  text-align: center
}
.hint {
  position: absolute;
  bottom: 25px;
  left: 28px;
  color: #7a8a7f;
  font-size: 11px;
  background: #f6f8f5df;
  padding: 7px;
  border-radius: 5px
}
footer {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  font-size: 10px;
  color: #87928a
}
.legend {
  display: flex;
  gap: 18px
}
.legend span {
  display: flex;
  align-items: center;
  gap: 6px
}
@media(max-width:700px) {
  header {
  padding: 0 14px
}
.brand small,.stats {
  display: none
}
.intro {
  padding: 20px;
  min-height: 135px
}
h1 {
  font-size: 20px
}
main {
  height: calc(100dvh - 241px)
}
footer {
  padding: 0 12px
}
.hint {
  display: none
}
.controls {
  right: 12px;
  bottom: 14px
}

}
 

.card { overflow-wrap: anywhere; }
.cardhead .reason { font-size: 12px; color: #67786c; line-height: 1.6; }
.root .reason { color: #bed0c2; }
.state.open { color: #805f0e; background: #fff5d6; }
.state.rejected { color: #96554c; background: #faeeeb; }
.state.unrecorded { color: #647369; background: #eff2ee; }
.root .state { color: #264c38; }
.override-key { color: #7750a5; }
.option { border-style: dashed; }
.card[hidden] { display: none; }
.card { position: relative; margin: 18px 24px 18px calc(24px + var(--depth) * 24px); }
#world { position: relative; }
main { height: auto; min-height: 0; overflow: auto; touch-action: auto; cursor: auto; }
#edges, .hint, .branch, .js-control { display: none; }
.interactive main { height: calc(100dvh - 251px); min-height: 360px; overflow: hidden; touch-action: none; cursor: grab; }
.interactive #world { position: absolute; }
.interactive .card { position: absolute; margin: 0; }
.interactive #edges, .interactive .branch, .interactive .hint, .interactive .js-control { display: block; }
.interactive .controls { display: flex; }
.interactive .dragging { cursor: grabbing; }
.no-script { padding: 20px; }
@media (max-width: 700px) {
  .interactive main { height: calc(100dvh - 241px); }
  .interactive .hint { display: none; }
  .intro { align-items: start; }
  footer { height: auto; min-height: 34px; gap: 12px; flex-wrap: wrap; }
}
`;

// Kept as readable JavaScript: tsc ships this string unchanged in the CLI bundle.
// All record text is server-escaped HTML, never interpolated into this program.
export const TREE_SCRIPT = String.raw`
(() => {
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const svg = document.getElementById('edges');
  const allButton = document.getElementById('all');
  const cards = Array.from(document.querySelectorAll('.card'));
  if (!cards.length) return;
  const items = cards.map(card => ({
    card, id: card.id, parentId: card.dataset.parent,
    anchor: document.getElementById(card.dataset.anchor),
    children: [], x: 0, y: 0, width: 0, height: 0, span: 0
  }));
  const byId = new Map(items.map(item => [item.id, item]));
  const roots = items.filter(item => !item.parentId);
  for (const item of items) {
    if (item.parentId) byId.get(item.parentId).children.push(item);
  }
  const collapsed = new Set();
  let scale = 1, tx = 0, ty = 0;
  let width = 0, height = 0, frame = 0;
  document.body.classList.add('interactive');

  function paint() {
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    document.getElementById('zoom').value = Math.round(scale * 100) + '%';
  }

  function updateVisibility(item, hidden) {
    item.card.hidden = hidden;
    for (const child of item.children) {
      const disclosure = child.anchor && child.anchor.closest('details');
      updateVisibility(child, hidden || collapsed.has(item.id) || !!(disclosure && !disclosure.open));
    }
  }

  function measure(item) {
    item.width = item.card.offsetWidth;
    item.height = item.card.offsetHeight;
    const children = item.children.filter(child => !child.card.hidden);
    const childrenHeight = children.reduce((sum, child) => sum + measure(child), 0);
    item.span = Math.max(item.height, childrenHeight + Math.max(0, children.length - 1) * 34);
    return item.span;
  }

  function place(item, x, y) {
    item.x = x;
    item.y = y + (item.span - item.height) / 2;
    item.card.style.left = item.x + 'px';
    item.card.style.top = item.y + 'px';
    let nextY = y;
    for (const child of item.children) {
      if (child.card.hidden) continue;
      place(child, x + item.width + 94, nextY);
      nextY += child.span + 34;
    }
  }

  function layout() {
    roots.forEach(root => updateVisibility(root, false));
    roots.forEach(measure);
    let nextY = 28;
    for (const root of roots) {
      place(root, 28, nextY);
      nextY += root.span + 36;
    }
    const visible = items.filter(item => !item.card.hidden);
    width = visible.reduce((max, item) => Math.max(max, item.x + item.width), 0) + 28;
    height = visible.reduce((max, item) => Math.max(max, item.y + item.height), 0) + 28;
    world.style.width = width + 'px';
    world.style.height = height + 'px';
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.replaceChildren();
    for (const item of visible) {
      if (!item.parentId) continue;
      const parent = byId.get(item.parentId);
      const source = item.anchor || parent.card.querySelector('.cardhead');
      const sourceRect = source.getBoundingClientRect();
      const parentRect = parent.card.getBoundingClientRect();
      const startY = parent.y + (sourceRect.top - parentRect.top + sourceRect.height / 2) / scale;
      const startX = parent.x + parent.width;
      const endX = item.x, endY = item.y + Math.min(65, item.height / 2);
      const midpoint = (startX + endX) / 2;
      const sourceState = item.anchor ? item.anchor.dataset.state : parent.card.dataset.state;
      const unlocked = !parent.card.classList.contains('root')
        && item.card.classList.contains('question') && sourceState === 'settled';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M' + startX + ',' + startY + ' C' + midpoint + ',' + startY
        + ' ' + midpoint + ',' + endY + ' ' + endX + ',' + endY);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', unlocked ? '#7ca38a' : '#b6c7ba');
      path.setAttribute('stroke-width', unlocked ? '2' : '1.5');
      if (!unlocked && !parent.card.classList.contains('root')) path.setAttribute('stroke-dasharray', '4 4');
      path.dataset.from = item.anchor ? item.anchor.id : parent.id;
      path.dataset.to = item.id;
      path.dataset.unlocked = String(unlocked);
      svg.append(path);
    }
    const details = Array.from(document.querySelectorAll('.alts'));
    allButton.textContent = details.length && details.every(detail => detail.open)
      ? 'Collapse all options' : 'Expand all options';
    allButton.disabled = details.length === 0;
    paint();
  }

  function scheduleLayout() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; layout(); });
  }

  function fit() {
    scale = Math.min(1, (viewport.clientWidth - 48) / width, (viewport.clientHeight - 88) / height);
    tx = (viewport.clientWidth - width * scale) / 2;
    ty = Math.max(16, (viewport.clientHeight - height * scale - 45) / 2);
    paint();
  }

  function zoom(factor) {
    const next = Math.max(Math.min(scale, .05), Math.min(2, scale * factor));
    const x = viewport.clientWidth / 2, y = viewport.clientHeight / 2;
    tx = x - (x - tx) * next / scale;
    ty = y - (y - ty) * next / scale;
    scale = next;
    paint();
  }

  for (const item of items) {
    const button = item.card.querySelector('.branch');
    if (!button) continue;
    button.addEventListener('click', () => {
      if (collapsed.has(item.id)) collapsed.delete(item.id);
      else collapsed.add(item.id);
      button.textContent = collapsed.has(item.id) ? '+' : '−';
      button.setAttribute('aria-expanded', String(!collapsed.has(item.id)));
      const before = item.card.getBoundingClientRect();
      layout();
      const after = item.card.getBoundingClientRect();
      tx += before.left - after.left;
      ty += before.top - after.top;
      paint();
    });
  }
  for (const detail of document.querySelectorAll('.alts')) detail.addEventListener('toggle', scheduleLayout);
  allButton.addEventListener('click', () => {
    const details = Array.from(document.querySelectorAll('.alts'));
    const open = !details.every(detail => detail.open);
    details.forEach(detail => { detail.open = open; });
    layout();
  });
  document.getElementById('plus').onclick = () => zoom(1.2);
  document.getElementById('minus').onclick = () => zoom(1 / 1.2);
  document.getElementById('fit').onclick = fit;
  document.getElementById('reset').onclick = () => zoom(1 / scale);

  let drag = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.card, .controls')) return;
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
  viewport.addEventListener('wheel', event => {
    // Leave browser zoom and accessibility magnification available.
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
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
  window.addEventListener('resize', () => { layout(); fit(); });
  layout();
  fit();
})();
`;
