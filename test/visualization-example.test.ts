import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { renderDecisionAtlas } from '../src/core/decision-atlas.js';
import { buildDecisionGraph } from '../src/core/graph.js';
import { markdownLines, type AdrRecord } from '../src/core/adr.js';
import { FAVICON_DATA_URI } from '../src/core/brand.js';

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
    tagName: string;
    type?: string;
    checked?: boolean;
    disabled?: boolean;
    classList: { add(name: string): void };
    textContent: string;
    className: string;
    children: Element[];
    style: Record<string, string>;
    readonly lastElementChild: Element | null;
    append(...children: Element[]): void;
    replaceChildren(): void;
  }

  // Run the shipped read() against a minimal DOM and return the body lookup.
  function renderReader(body: string, page = example): (selector: string) => Element {
    const element = (tag = 'div'): Element => {
      let text = '';
      const node: Element = {
        tag, tagName: tag.toUpperCase(), className: '', children: [], style: {},
        get textContent(): string { return text + this.children.map(child => child.textContent).join(''); },
        set textContent(value: string) { text = value; this.children = []; },
        classList: { add(name: string) { node.className = name; } },
        get lastElementChild() { return this.children.at(-1) ?? null; },
        append(...children) { this.children.push(...children); },
        replaceChildren() { text = ''; this.children = []; },
      };
      return node;
    };
    const nodes = new Map<string, Element>();
    const lookup = (selector: string): Element => {
      let node = nodes.get(selector);
      if (!node) { node = element(); nodes.set(selector, node); }
      return node;
    };
    const descendants = (node: Element): Element[] => node.children.flatMap(child => [child, ...descendants(child)]);
    const document = {
      createElement: (tag: string) => element(tag), querySelector: lookup,
      createTextNode: (text: string) => Object.assign(element('#text'), { textContent: text }),
      querySelectorAll: () => descendants(lookup('#reader-body')).filter(node => node.tag === 'p' || node.tag === 'li'),
    };
    const make = page.match(/const make = \(tag, cls, text\) => \{[\s\S]*?\n\};/)![0];
    const start = page.indexOf('function readerLines(');
    const read = page.slice(start, page.indexOf('world.addEventListener', start));
    const inline = page.slice(page.indexOf('function inlineInto'), page.indexOf('function showContext'));
    const records = [{ number: 1, title: 'Record', lifecycle: 'implemented', tags: [], source: '', body }];
    runInNewContext(`${make}\n${inline}\n${read}\nread(1);\ndocument.querySelectorAll().forEach(inlineText);`, {
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

  it.each([
    ['zh', 'implemented'], ['en', 'implemented'], ['zh', 'archived'], ['en', 'archived'],
  ] as const)('renders task lists through the generated %s atlas (%s)', (language, folder) => {
    const body = '## Consequences\n\n### Verification\n\n- [x] **Complete** with `code`\n  continued\n+ [ ] Pending\n* [X] Uppercase\n<!-- hidden template guidance -->\n- ordinary item\n- [x]literal\n\n3. [x] Ordered';
    const record = {
      number: 1, title: 'Tasks', folder, status: 'implemented',
      created: '2026-10-23', date: '2026-10-23',
      path: 'adr/implemented/1-tasks.md', fileName: '1-tasks.md',
      sections: [{ heading: 'Consequences', body: body.slice('## Consequences'.length) }],
    } as AdrRecord;
    const page = renderDecisionAtlas({
      template: example, records: [record], graph: buildDecisionGraph([record]),
      commit: 'abc1234', repositoryUrl: 'https://github.com/example/repo/', projectName: 'Example', language,
    });
    const open = '/* atlas:records */', close = '/* /atlas:records */';
    const slot = page.slice(page.indexOf(open) + open.length, page.indexOf(close)).trim();
    const payload = JSON.parse(slot.slice('const records = '.length, -1)) as Array<{ body: string }>;
    const lookup = renderReader(payload[0]!.body, page);
    expect(lookup('#reader-body').textContent).not.toContain('hidden template guidance');
    const list = lookup('#reader-body').children.find(child => child.tag === 'ul')!;
    expect(list.children.slice(0, 3).map(item => item.children[0]?.children[0])).toEqual([
      expect.objectContaining({ tag: 'input', type: 'checkbox', checked: true, disabled: true }),
      expect.objectContaining({ tag: 'input', type: 'checkbox', checked: false, disabled: true }),
      expect.objectContaining({ tag: 'input', type: 'checkbox', checked: true, disabled: true }),
    ]);
    const first = list.children[0]!;
    expect(first.className).toBe('task-list-item');
    expect(first.children[0]?.tag).toBe('label');
    expect(first.textContent).toBe('Complete with code continued');
    const content = first.children[0]!.children[1]!;
    expect(content.children.map(child => child.tag)).toContain('strong');
    expect(content.children.map(child => child.tag)).toContain('code');
    expect(list.children.slice(3).map(item => item.textContent)).toEqual(['ordinary item', '[x]literal']);
    const ordered = lookup('#reader-body').children.find(child => child.tag === 'ol')!;
    expect(ordered.children[0]?.children[0]?.children[0]).toMatchObject({ checked: true, disabled: true });
  });

  it('leaves task-like text in paragraphs, inline code, and fenced code literal', () => {
    const lookup = renderReader('## Decision\n\n[x] Paragraph\n\n- `[x]` Code\n\n```md\n- [x] Fenced\n```');
    const body = lookup('#reader-body');
    expect(body.children.find(child => child.tag === 'p')?.textContent).toBe('[x] Paragraph');
    const item = body.children.find(child => child.tag === 'ul')!.children[0]!;
    expect(item.children[0]?.tag).toBe('code');
    expect(item.textContent).toBe('[x] Code');
    expect(body.children.find(child => child.tag === 'pre')?.textContent).toBe('- [x] Fenced\n');
  });

  it.each([
    'Before <!-- hidden --> after',
    '<!-- multi\n## hidden\n-->Visible',
    'Visible\n<!-- unfinished\nNever shown',
    '`<!-- inline -->` then <!-- hidden -->',
    '``<!-- `nested` -->`` then <!-- hidden -->',
    '```html\n<!-- code -->\n```\n<!-- hidden -->',
    '~~~html\n<!-- code -->\n~~~\n<!-- hidden -->',
    '````html\n```\n<!-- code -->\n````\n<!-- hidden -->',
  ])('keeps comment visibility aligned with the core scanner: %s', (body) => {
    const start = example.indexOf('function readerLines(');
    const helper = example.slice(start, example.indexOf('function read(number){', start));
    const visible = runInNewContext(`${helper}\nreaderLines(body);`, { body }) as string[];
    expect(visible.filter(line => line.trim())).toEqual(
      [...markdownLines(body)].map(line => line.visible).filter(line => line.trim()),
    );
  });

  it('hides template comments after alternatives without swallowing visible text', () => {
    const lookup = renderReader('## Alternatives considered\n\n- Keep orchestration: rejected.\n<!-- Each genuine alternative and why it lost. Keep this section. -->\n- Another choice: rejected.\n\nBefore <!-- hidden --> after.');
    const body = lookup('#reader-body');
    expect(body.textContent).not.toContain('<!--');
    expect(body.textContent).not.toContain('Each genuine');
    const list = body.children.find(child => child.tag === 'ul')!;
    expect(list.children.map(child => child.textContent)).toEqual([
      'Keep orchestration: rejected.', 'Another choice: rejected.',
    ]);
    expect(body.children.find(child => child.tag === 'p')?.textContent.replace(/ +/g, ' ')).toBe('Before after.');
  });

  it('hides multiline and unterminated comments, including Markdown-looking content', () => {
    const lookup = renderReader('## Decision\n\nVisible.\n<!-- hidden\n## Fake heading\n- [x] fake task\n```\n-->\n\nAfter.\n<!-- unfinished\nNever shown');
    const body = lookup('#reader-body');
    expect(body.children.map(child => [child.tag, child.textContent])).toEqual([
      ['h3', 'Decision'], ['p', 'Visible.'], ['p', 'After.'],
    ]);
  });

  it('preserves comment examples in code while hiding subsequent real comments', () => {
    const lookup = renderReader('## Decision\n\nLiteral `<!-- inline -->` and ``<!-- `nested` -->``.\n\n```html\n<!-- fenced -->\n```\n\nAfter <!-- hidden --> visible.');
    const body = lookup('#reader-body');
    expect(body.textContent).toContain('<!-- inline -->');
    expect(body.textContent).toContain('<!-- nested -->');
    expect(body.children.find(child => child.tag === 'pre')?.textContent).toBe('<!-- fenced -->\n');
    expect(body.textContent).not.toContain('hidden');
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

describe('archive page shell', () => {
  it('anchors the canvas dock to the viewport, not the page', () => {
    // The dock is absolutely positioned; without a positioned viewport it
    // anchors to the initial containing block and drifts into the canvas
    // whenever a deep link scrolls the page.
    const rule = example.match(/#viewport\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('position:relative');
  });

  it('carries a self-contained favicon', () => {
    expect(example).toContain('rel="icon"');
    expect(example).toContain('data:image/svg+xml;base64,');
    // One mark for every page: the static example and the generated pages
    // share the constant the CLI inlines.
    expect(example).toContain(FAVICON_DATA_URI);
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


describe('chapter navigation stability', () => {
  it('keeps right alignment and overflow safety confined to the mobile navigation override', () => {
    const override = example.match(/<style>\.chapter-inner\{gap:32px\}([\s\S]*?)<\/style>/)![1];
    const split = override.indexOf('@media(max-width:760px)');
    const desktop = override.slice(0, split), mobile = override.slice(split);
    expect(desktop).toContain('.chapter-links{margin-inline-start:auto}');
    expect(desktop).not.toContain('justify-content');
    const rule = mobile.match(/\.chapter-links\{([^}]+)\}/)![1];
    expect(rule).toContain('flex:0 1 auto');
    expect(rule).toContain('min-width:0');
    expect(rule).toContain('justify-content:safe flex-end');
    expect(rule).toContain('mask-image:none');
  });

  it.each([false, true])('does not restart scrolling within one chapter (reduced motion: %s)', (reducedMotion) => {
    const callbacks = new Map<string, () => void>();
    const frames: Array<() => void> = [];
    const scrolls: unknown[] = [];
    const links = [0, 1].map(index => ({
      hash: `#section-${index}`, offsetLeft: index * 150, offsetWidth: 120,
      setAttribute() {}, classList: { toggle() {} }, addEventListener() {},
    }));
    let active = 1;
    const indicator = { style: { setProperty() {} } };
    const nav = {
      scrollWidth: 300, clientWidth: 150, scrollLeft: 0,
      querySelectorAll: () => links,
      querySelector: (selector: string) => selector === '.chapter-indicator' ? indicator : links[active],
      scrollTo(options: unknown) { scrolls.push(options); },
    };
    const start = example.indexOf("const nav = document.querySelector('.chapter-links');");
    const script = example.slice(start, example.indexOf('})();</script>', start));
    runInNewContext(script, {
      document: {
        body: {}, querySelector: () => nav,
        addEventListener(name: string, callback: () => void) { callbacks.set(name, callback); },
      },
      CSS: { supports: () => true },
      matchMedia: () => ({ matches: reducedMotion }),
      requestAnimationFrame(callback: () => void) { frames.push(callback); return frames.length; },
      addEventListener(name: string, callback: () => void) { callbacks.set(name, callback); },
      ResizeObserver: class { observe() {} },
    });
    expect(scrolls).toHaveLength(1);
    for (let n = 0; n < 3; n++) {
      callbacks.get('scroll')!();
      while (frames.length) frames.shift()!();
    }
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0]).toMatchObject({ behavior: reducedMotion ? 'auto' : 'smooth' });
    // A newly active, offscreen chapter may still be brought into view.
    active = 0;
    nav.scrollLeft = 150;
    callbacks.get('scroll')!();
    while (frames.length) frames.shift()!();
    expect(scrolls).toHaveLength(2);
  });
});
