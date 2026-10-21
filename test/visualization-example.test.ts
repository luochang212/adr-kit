import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const example = readFileSync(new URL(
  '../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url,
), 'utf8');

// Execute the example's real card renderer with a minimal DOM, without adding
// a browser dependency to the unit gate. Browser layout is checked separately.
function renderCards(records: Record<string, unknown>[]) {
  interface Element {
    textContent: string;
    className: string;
    dataset: Record<string, unknown>;
    children: Element[];
    append(...children: Element[]): void;
    replaceChildren(): void;
    addEventListener(): void;
  }
  const element = (): Element => ({
    textContent: '', className: '', dataset: {}, children: [],
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; },
    addEventListener() {},
  });
  const cards = element(), count = element();
  const document = {
    createElement: element,
    querySelector: (selector: string) => selector === '#decision-cards' ? cards : count,
  };
  const make = example.match(/const make = \(tag, cls, text\) => \{[\s\S]*?\n\};/)![0];
  const render = example.match(/function renderCards\(visible\) \{[\s\S]*?\n\}/)![0];
  runInNewContext(`${make}\n${render}\nrenderCards(records);`, {
    document, records, read() {}, statusName: { implemented: '生效', archived: '归档' },
  });
  return { summaries: cards.children.map(card => card.children[2]?.textContent), count: count.textContent };
}

describe('visualization example archive cards', () => {
  const archived = { number: 1, title: 'Storage', created: '2026-10-21',
    status: 'implemented', lifecycle: 'archived', body: '' };

  it('shows an ordinary archive reason without inventing a successor (ADR 18)', () => {
    const reason = 'Current behavior is owned by storage/config.ts';
    const result = renderCards([{ ...archived, 'archive-reason': reason }]);
    expect(result.summaries[0]).toContain(reason);
    expect(result.summaries[0]).not.toMatch(/undefined|替代/);
    expect(result.count).toContain('生效 0 · 归档 1');
  });

  it('keeps archives without a reason readable without inventing a successor', () => {
    const result = renderCards([archived]);
    expect(result.summaries[0]).toContain('归档历史');
    expect(result.summaries[0]).not.toMatch(/undefined|替代/);
  });

  it('still names the successor for superseded archives', () => {
    const result = renderCards([{ ...archived, status: 'superseded', 'superseded-by': 2 }]);
    expect(result.summaries[0]).toContain('已由 ADR 2 替代');
  });
});


describe('reader typography', () => {
  interface Element {
    tag: string;
    textContent: string;
    className: string;
    children: Element[];
    style: Record<string, string>;
    readonly lastElementChild: Element | null;
    append(...children: Element[]): void;
    replaceChildren(): void;
  }

  // Run the shipped read() against a minimal DOM and return the body lookup.
  function renderReader(body: string): (selector: string) => Element {
    const element = (tag = 'div'): Element => ({
      tag, textContent: '', className: '', children: [], style: {},
      get lastElementChild() { return this.children.at(-1) ?? null; },
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
    });
    const nodes = new Map<string, Element>();
    const lookup = (selector: string): Element => {
      let node = nodes.get(selector);
      if (!node) { node = element(); nodes.set(selector, node); }
      return node;
    };
    const document = { createElement: (tag: string) => element(tag), querySelector: lookup };
    const make = example.match(/const make = \(tag, cls, text\) => \{[\s\S]*?\n\};/)![0];
    const start = example.indexOf('function read(number){');
    const read = example.slice(start, example.indexOf('world.addEventListener', start));
    const records = [{ number: 1, title: 'Record', lifecycle: 'implemented', tags: [], source: '', body }];
    runInNewContext(`${make}\n${read}\nread(1);`, {
      document, records, statusName: { implemented: '生效' }, nodes: [],
      showContext() {},
      reader: { open: false, showModal() {}, scrollTop: 0, classList: { add() {}, remove() {} } },
    });
    return lookup;
  }

  it('reflows hard-wrapped prose instead of preserving source line breaks', () => {
    // Records are hard-wrapped at ~80 columns. Preserving those newlines
    // fragments a paragraph into ragged lines; only pre stays verbatim.
    const rule = (selector: string) => example.match(
      new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}'),
    )?.[1] ?? '';
    for (const selector of ['#reader-body p', '#reader-body li']) {
      expect(rule(selector), selector).toContain('white-space:normal');
      expect(rule(selector), selector).toContain('text-wrap:pretty');
      expect(rule(selector), selector).not.toContain('pre-wrap');
    }
  });

  it('keeps the fixed close tab aligned with the reader width', () => {
    expect(example).toContain('width:clamp(460px,45vw,1024px)');
    expect(example).toContain('right:calc(clamp(460px,45vw,1024px) - 17px)');
  });

  it('keeps a hard-wrapped list item inside its bullet', () => {
    const lookup = renderReader('## Decision\n\n- first line\n  continued here\n- second item');
    const list = lookup('#reader-body').children.find((child) => child.tag === 'ul')!;
    expect(list.children.map((item) => item.textContent)).toEqual([
      'first line continued here',
      'second item',
    ]);
  });

  it('renders code and emphasis nested in bold', () => {
    interface TextNode { text: string }
    interface Node { tag: string; textContent: string; className: string; children: Array<Node | TextNode>; append(...children: Array<Node | TextNode>): void; replaceChildren(): void }
    const element = (tag = 'div'): Node => ({
      tag, textContent: '', className: '', children: [],
      append(...children) { this.children.push(...children); },
      replaceChildren() { this.children = []; },
    });
    const document = { createElement: (tag: string) => element(tag), createTextNode: (text: string) => ({ text }) };
    const make = example.match(/const make = \(tag, cls, text\) => \{[\s\S]*?\n\};/)![0];
    const start = example.indexOf('function inlineInto');
    const inline = example.slice(start, example.indexOf('function showContext', start));
    const root = element();
    root.textContent = '**Require `paths`** and *key*';
    runInNewContext(`${make}\n${inline}\ninlineText(root);`, { document, root });
    const strong = root.children.find((child): child is Node => 'tag' in child && child.tag === 'strong')!;
    expect(strong.children).toEqual([
      { text: 'Require ' },
      expect.objectContaining({ tag: 'code', textContent: 'paths' }),
    ]);
    const em = root.children.find((child): child is Node => 'tag' in child && child.tag === 'em')!;
    expect(em.children).toEqual([{ text: 'key' }]);
  });

  it('renders ordered lists and keeps their continuation lines', () => {
    const lookup = renderReader('## Consequences\n\n### Trade-offs\n\n1. first\n   continued\n2. second');
    const list = lookup('#reader-body').children.find((child) => child.tag === 'ol')!;
    expect(list.children.map((item) => item.textContent)).toEqual(['first continued', 'second']);
  });

  it('renders record subheadings instead of literal hash marks', () => {
    const lookup = renderReader('## Consequences\n\n### Verification\n\nA fact.\n\n### Trade-offs\n\nA cost.');
    expect(lookup('#reader-body').children.map((child) => [child.tag, child.textContent])).toEqual([
      ['h3', 'Consequences'],
      ['h4', 'Verification'],
      ['p', 'A fact.'],
      ['h4', 'Trade-offs'],
      ['p', 'A cost.'],
    ]);
  });
});

describe('range index date labels', () => {
  it.each([[320, 11], [1024, 40]])('keeps endpoint dates and readable spacing at %i px with %i columns', (width, count) => {
    const segments = Array.from({ length: count }, () => {
      const state = { hidden: false, shift: 0 };
      return {
        state,
        classList: { toggle(name: string, value: boolean) {
          if (name === 'label-hidden') state.hidden = value;
        } },
        style: { setProperty(_name: string, value: string) { state.shift = parseFloat(value); } },
      };
    });
    const columns = Array.from({ length: count }, (_, i) => ({ x: i * 280 }));
    const viewbox = { x: 0, width: count * 280 };
    const layout = example.match(/function syncRailLabels\(\) \{[\s\S]*?\n\}/)![0];
    runInNewContext(`${layout}\nsyncRailLabels();`, {
      track: { clientWidth: width, querySelectorAll: () => segments }, columns, viewbox,
    });
    expect(segments[0]!.state.hidden).toBe(false);
    expect(segments.at(-1)!.state.hidden).toBe(false);
    const visible = segments.flatMap((segment, i) => segment.state.hidden ? [] : [
      (columns[i]!.x + 124) / viewbox.width * width + segment.state.shift,
    ]);
    expect(visible.length).toBeGreaterThan(2);
    expect(visible.length).toBeLessThan(count);
    visible.forEach((x, i) => {
      expect(x).toBeGreaterThanOrEqual(24);
      expect(x).toBeLessThanOrEqual(width - 24);
      if (i) expect(x - visible[i - 1]!).toBeGreaterThanOrEqual(52);
    });
  });
});
