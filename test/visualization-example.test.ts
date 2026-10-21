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
