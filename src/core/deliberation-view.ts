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
main {
  position: relative;
  background-image: radial-gradient(#cdd8cc .8px,transparent .8px);
  background-size: 20px 20px;
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
  color: #264c38;
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
.virtual {
  width: 168px;
  background: #fbfdfb;
  border-style: dashed;
  border-color: #b6c7ba;
}
.virtual .cardhead {
  padding: 14px 16px 12px;
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
.card { overflow-wrap: anywhere; }
.cardhead .reason { font-size: 12px; color: #67786c; line-height: 1.6; }
.root .reason { color: #bed0c2; }
.state.open { color: #805f0e; background: #fff5d6; }
.state.rejected { color: #96554c; background: #faeeeb; }
.state.unrecorded { color: #647369; background: #eff2ee; }
.root .state { color: #264c38; }
.root .alts { color: #bacdbc; border-top-color: #3f6455; }
.root .alt { color: #cfdcd1; border-top-color: #3f6455; }
.root .alt .badge { color: #a3bba9; }
.root .alt p { color: #b4c4b6; }
.override-key { color: #7750a5; }
/* The legend's state keys quote the card chips, so they match their size. */
.canvas-legend .legend .state { font-size: 10px; }
/* The edge keys are line samples, drawn in the stroke the view actually uses:
   a key that looks like a line but not like the line it names teaches nothing. */
.edge-key { width: 22px; height: 0; border-top: 1.5px solid #b6c7ba; }
.edge-key.unlocked { border-top: 2px solid #7ca38a; }
.option { border-style: dashed; }
.card[hidden] { display: none; }
.card { position: relative; margin: 18px 24px 18px calc(24px + var(--depth) * 24px); }
#world { position: relative; }
main { height: auto; min-height: 0; overflow: auto; touch-action: auto; cursor: auto; }
#edges, .branch, .js-control { display: none; }

.interactive #world { position: absolute; }
.interactive .card { position: absolute; margin: 0; }
.interactive #edges, .interactive .branch, .interactive .js-control { display: block; }
.no-script { padding: 20px; }
`;

// Kept as readable JavaScript: tsc ships this string unchanged in the CLI bundle.
// All record text is server-escaped HTML, never interpolated into this program.
export const TREE_SCRIPT = String.raw`
(() => {
  const canvas = window.__adrCanvas;
  if (!canvas) return;
  const { viewport, world } = canvas;
  const svg = document.getElementById('edges');
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
    const width = visible.reduce((max, item) => Math.max(max, item.x + item.width), 0) + 28;
    const height = visible.reduce((max, item) => Math.max(max, item.y + item.height), 0) + 28;
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
      const startY = parent.y + (sourceRect.top - parentRect.top + sourceRect.height / 2) / canvas.scale;
      const startX = parent.x + parent.width;
      const endX = item.x, endY = item.y + Math.min(65, item.height / 2);
      const midpoint = (startX + endX) / 2;
      // The server settled whether this edge is an unlocked one, so the styler
      // and the legend cannot disagree about which edges are frontier steps.
      const unlocked = item.card.dataset.unlocked === 'true';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M' + startX + ',' + startY + ' C' + midpoint + ',' + startY
        + ' ' + midpoint + ',' + endY + ' ' + endX + ',' + endY);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', unlocked ? '#7ca38a' : '#b6c7ba');
      path.setAttribute('stroke-width', unlocked ? '2' : '1.5');
      path.dataset.from = item.anchor ? item.anchor.id : parent.id;
      path.dataset.to = item.id;
      path.dataset.unlocked = String(unlocked);
      svg.append(path);
    }
    canvas.paint();
  }
  window.__adrCanvasLayout = layout;

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
      canvas.addPan(before.left - after.left, before.top - after.top);
    });
  }
  for (const detail of document.querySelectorAll('.alts')) detail.addEventListener('toggle', () => canvas.schedule());

  layout();
  canvas.fitWidth();
})();

`;
