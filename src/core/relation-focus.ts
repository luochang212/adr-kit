/** Shared hover/keyboard emphasis for both offline views (ADR 11). */
export const RELATION_STYLE = String.raw`
.node, .card, .edge, #edges path { transition: opacity .16s ease; }
.node.relation-dim, .card.relation-dim { opacity: .25; }
.edge.relation-dim, #edges path.relation-dim { opacity: .12; }
.card:focus-visible { outline: 2px solid #7750a5; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .node, .card, .edge, #edges path { transition: none; }
}
`;

export const RELATION_SCRIPT = String.raw`
(() => {
  const world = document.getElementById('world');
  const viewport = document.getElementById('viewport');
  if (!world || !viewport) return;
  const isTree = !!document.getElementById('edges');
  const nodes = Array.from(world.querySelectorAll(isTree ? '.card' : '.node'));
  const key = node => isTree ? node.id : node.dataset.adr;
  let active = null;

  // For a map, only incident edges count. For a tree, walk upstream and
  // downstream separately: walking both ways in one pass would pull in siblings.
  function relatedNodes(id, links, tree) {
    const lit = new Set([id]);
    if (!tree) {
      for (const link of links) {
        if (link.from === id) lit.add(link.to);
        if (link.to === id) lit.add(link.from);
      }
      return lit;
    }
    for (const direction of ['from', 'to']) {
      const seen = new Set([id]), queue = [id];
      for (let i = 0; i < queue.length; i++) {
        for (const link of links) {
          const next = direction === 'from' ? link.to : link.from;
          if (link[direction] !== queue[i] || seen.has(next)) continue;
          seen.add(next);
          lit.add(next);
          queue.push(next);
        }
      }
    }
    return lit;
  }

  function nodeFor(target) {
    if (!target || !world.contains(target)) return null;
    return target.closest('.card, .node') || target.closest('a')?.querySelector('.node') || null;
  }

  function paint() {
    if (active && active.hidden) active = null;
    const paths = Array.from(world.querySelectorAll(isTree ? '#edges path' : '.edge'));
    const links = paths.map(path => ({
      path,
      // Tree edges may start at an answer within a card, not the card itself.
      from: isTree ? document.getElementById(path.dataset.from).closest('.card').id : path.dataset.from,
      to: path.dataset.to,
    }));
    const id = active && key(active);
    const lit = id ? relatedNodes(id, links, isTree) : null;
    nodes.forEach(node => node.classList.toggle('relation-dim', !!lit && !lit.has(key(node))));
    links.forEach(link => {
      const related = !lit || (isTree ? lit.has(link.from) && lit.has(link.to) : link.from === id || link.to === id);
      link.path.classList.toggle('relation-dim', !related);
    });
  }

  function select(node) {
    if (active === node) return;
    active = node;
    paint();
  }
  viewport.addEventListener('pointermove', event => {
    if (event.buttons || event.pointerType === 'touch') return;
    select(nodeFor(event.target));
  });
  viewport.addEventListener('pointerleave', () => select(null));
  viewport.addEventListener('pointerdown', () => select(null));
  world.addEventListener('focusin', event => select(nodeFor(event.target)));
  world.addEventListener('focusout', event => select(nodeFor(event.relatedTarget)));
  viewport.addEventListener('keydown', event => { if (event.key === 'Escape') select(null); });
  window.addEventListener('blur', () => select(null));
  // Folding recreates the tree's edges; apply emphasis to the new paths too.
  world.addEventListener('adr-layout', paint);
})();
`;
