import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const graph = readFileSync(new URL('../site/src/components/Graph.astro', import.meta.url), 'utf8');

describe('homepage atlas link', () => {
  it('opens Signal directly in the homepage language', () => {
    const link = graph.split('\n').find(line => line.includes('class="graph__atlas reveal"'));
    expect(link).toBeDefined();
    expect(link).toContain("'signal.en.html'");
    expect(link).toContain("'signal.html'");
    expect(link).not.toContain("'index.html'");
    expect(link).not.toContain("'en.html'");
  });
  it('keeps the theme gallery in both READMEs', () => {
    const english = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const chinese = readFileSync(new URL('../README.zh.md', import.meta.url), 'utf8');
    expect(english).toContain("[Preview ADR Kit's atlas themes →](https://luochang212.github.io/adr-kit/decisions/en.html)");
    expect(chinese).toContain('[预览 ADR Kit 的档案主题 →](https://luochang212.github.io/adr-kit/decisions/)');
  });
});
