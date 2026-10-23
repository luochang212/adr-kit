import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const example = readFileSync(new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url), 'utf8');
const script = example.match(/<script data-insight-layout>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Insight layout script is missing');

// Supply measured row bottoms, including headings, notes and panel padding.
// Execute the shipped script; geometry stays explicit so the tests cover
// selection and resize behavior without pretending a DOM shim lays out text.
function layout(heights: number[][], { rem = 16 } = {}) {
  let width = 1000, resize = () => {}, fontsReady = () => {};
  let reads = 0;
  const frames: (() => void)[] = [];
  const groups = heights.map(values => values.map((_, i) => ({
    hidden: false,
    getBoundingClientRect() { reads++; return { bottom: values[i]! + 80 }; },
  })));
  const panels = groups.map((rows, i) => ({
    id: i === 0 ? 'inbound' : 'replacements',
    querySelectorAll: () => rows,
    getBoundingClientRect: () => ({ top: 100 }),
  }));
  const columns = {
    querySelectorAll: () => panels,
    getBoundingClientRect: () => ({ width }),
  };
  const root = {};
  runInNewContext(script!, {
    document: {
      querySelector: () => columns,
      documentElement: root,
      fonts: { ready: { then: (fn: () => void) => { fontsReady = fn; } } },
    },
    getComputedStyle: (el: unknown) => el === root ? { fontSize: String(rem) } : { paddingBottom: '20' },
    ResizeObserver: class {
      constructor(fn: () => void) { resize = fn; }
      observe() {}
    },
    requestAnimationFrame: (fn: () => void) => { frames.push(fn); },
  });
  return {
    visible: () => groups.map(rows => rows.filter(row => !row.hidden).length),
    reads: () => reads,
    resize(next = width) { width = next; resize(); },
    fontsReady: () => fontsReady(),
    flush() { frames.splice(0).forEach(fn => fn()); },
    frameCount: () => frames.length,
  };
}

describe('atlas insight height budgets', () => {
  it('adds hubs beyond six while reducing taller replacement chains', () => {
    const result = layout([[140, 180, 220, 260, 300, 340, 380, 420, 460], [240, 400, 700]]);
    expect(result.visible()).toEqual([8, 2]);
  });

  it('compares full rendered heights, including different heading and note heights', () => {
    // The closest complete prefixes to 416 are 420 and 500; both fit the
    // maximum of 560 even though the second panel's heading is taller.
    const result = layout([[170, 220, 270, 320, 370, 420, 480, 550], [320, 500]]);
    expect(result.visible()).toEqual([6, 2]);
  });

  it('keeps sparse content short without a forced minimum', () => {
    expect(layout([[150], [190]]).visible()).toEqual([1, 1]);
    expect(layout([[150, 230, 310, 390], [150]]).visible()).toEqual([4, 1]);
    expect(example).not.toMatch(/\.insight-columns[^{}]*\{[^}]*min-(?:block-size|height)/);
  });

  it('hides an oversized row as a whole instead of clipping a title or card', () => {
    expect(layout([[200, 900, 950], [580]]).visible()).toEqual([1, 0]);
    expect(example).toContain('.insight-columns [hidden]{display:none}');
  });

  it('keeps the preferred height stable when the other panel gains content', () => {
    const hubs = [170, 220, 270, 320, 370, 420, 470, 520];
    expect(layout([hubs, [240, 400]]).visible()).toEqual([6, 2]);
    expect(layout([hubs, [240, 400, 700, 1000]]).visible()).toEqual([6, 2]);
  });

  it('uses the preferred height for a single module and handles no modules', () => {
    expect(layout([[180, 250, 320, 390, 460, 530, 600]]).visible()).toEqual([4]);
    expect(layout([]).visible()).toEqual([]);
  });

  it('scales the preferred height and maximum with the root text size', () => {
    expect(layout([[600, 800]], { rem: 24 }).visible()).toEqual([1]);
    expect(layout([[700, 850]], { rem: 24 }).visible()).toEqual([1]);
    expect(layout([[600, 800]]).visible()).toEqual([0]);
  });

  it('restores hidden candidates before measuring a changed width', () => {
    const heights = [[180, 280, 380, 480, 580], [230, 440, 650]];
    const result = layout(heights);
    expect(result.visible()).toEqual([3, 2]);
    heights[0]!.splice(0, 5, 150, 200, 250, 300, 350);
    heights[1]!.splice(0, 3, 180, 280, 380);
    result.resize(1200);
    result.flush();
    expect(result.visible()).toEqual([5, 3]);
  });

  it('ignores height-only notifications and batches width and font changes', () => {
    const result = layout([[200, 300], [400, 500]]);
    const reads = result.reads();
    result.resize();
    expect(result.frameCount()).toBe(0);
    expect(result.reads()).toBe(reads);
    result.resize(900);
    result.fontsReady();
    expect(result.frameCount()).toBe(1);
    result.flush();
    expect(result.reads()).toBeGreaterThan(reads);
  });

  it('uses measured narrow-screen rows without increasing the preferred height', () => {
    expect(layout([[220, 320, 420, 520], [300, 490, 680]]).visible()).toEqual([3, 2]);
  });

  it('runs after candidates are rendered and absent modules removed', () => {
    expect(example.indexOf('<script data-insight-layout>')).toBeGreaterThan(example.indexOf("columns.classList.add('single')"));
    expect(example).not.toContain('.slice(0, 6).forEach(({ r, count })');
  });
});

describe('atlas density chart', () => {
  it('centers the density counts and their dates together', () => {
    expect(example).toContain('.density-day b,.density-day span{text-align:center}');
  });
});
