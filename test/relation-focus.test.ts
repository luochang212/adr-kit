import { describe, expect, it } from 'vitest';
import { RELATION_SCRIPT } from '../src/core/relation-focus.js';
import { SHARE_SCRIPT } from '../src/core/share.js';

const source = RELATION_SCRIPT.slice(RELATION_SCRIPT.indexOf('  function relatedNodes'),
  RELATION_SCRIPT.indexOf('  function nodeFor'));
const related = new Function('id', 'links', 'tree', source + '; return [...relatedNodes(id, links, tree)].sort();');
const links = [
  { from: 'root', to: 'a' }, { from: 'root', to: 'b' },
  { from: 'a', to: 'c' }, { from: 'c', to: 'd' },
  { from: 'b', to: 'e' },
];

describe('relation focus', () => {
  it('highlights only direct neighbours in the map, including incoming relationships', () => {
    expect(related('a', links, false)).toEqual(['a', 'c', 'root']);
    expect(related('absent', links, false)).toEqual(['absent']);
  });
  it('traces ancestors and descendants without pulling in sibling branches', () => {
    expect(related('c', links, true)).toEqual(['a', 'c', 'd', 'root']);
    expect(related('root', links, true)).toEqual(['a', 'b', 'c', 'd', 'e', 'root']);
  });
  it('respects a folded tree represented by its currently drawn edges', () => {
    expect(related('a', links.slice(0, 2), true)).toEqual(['a', 'root']);
    expect(related('root', [], true)).toEqual(['root']);
  });
  it('terminates even if relationships contain a cycle', () => {
    expect(related('a', [...links, { from: 'd', to: 'a' }], true)).toEqual(['a', 'c', 'd', 'root']);
  });
  it('clears transient emphasis from both export copies', () => {
    expect(SHARE_SCRIPT).toContain("svg.querySelectorAll('.relation-dim').forEach(node => node.classList.remove('relation-dim'))");
    expect(SHARE_SCRIPT).toContain("clone.querySelectorAll('.relation-dim').forEach(node => node.classList.remove('relation-dim'))");
  });
});
