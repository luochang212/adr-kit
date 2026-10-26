import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const graph = readFileSync(new URL('../site/src/components/Graph.astro', import.meta.url), 'utf8');

describe('homepage atlas link', () => {
  it('targets explicit gallery files in both languages, so it resolves on the dev server too', () => {
    const link = graph.split('\n').find(line => line.includes('class="graph__atlas reveal"'));
    expect(link).toBeDefined();
    expect(link).toContain("'en.html'");
    expect(link).toContain("'index.html'");
    expect(link).not.toMatch(/\?\s*'en\.html'\s*:\s*''/);
  });
});
