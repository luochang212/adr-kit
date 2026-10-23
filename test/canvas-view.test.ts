import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { CANVAS_SCRIPT } from '../src/core/canvas-view.js';

const example = readFileSync(new URL(
  '../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url,
), 'utf8');
const start = example.indexOf("(() => {\n  const viewport = document.getElementById('viewport');");
const atlasController = example.slice(start, example.indexOf('\n})();', start) + 6);
const initialStart = example.indexOf('const initialView = () =>');
const initialView = example.slice(initialStart, example.indexOf('\n})();', initialStart));

type Handler = () => void;
interface Canvas {
  scale: number;
  zoom(factor: number): void;
  addPan(dx: number, dy: number): void;
}

function controller(script: string, width: number, atlas: boolean) {
  const element = () => ({
    style: { transform: '' }, classList: { add() {}, remove() {} },
    handlers: new Map<string, Handler[]>(),
    addEventListener(name: string, handler: Handler) {
      const handlers = this.handlers.get(name) ?? [];
      handlers.push(handler);
      this.handlers.set(name, handlers);
    },
    querySelector: () => null,
  });
  const viewport = {
    ...element(), clientWidth: width, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const world = { ...element(), offsetWidth: 8000, offsetHeight: 1000 };
  const elements: Record<string, ReturnType<typeof element>> = {
    viewport, world, zoom: element(), fit: element(), reset: element(),
  };
  const window = {
    handlers: new Map<string, Handler>(), __adrCanvas: undefined as Canvas | undefined,
    __adrCanvasLayout: () => {},
    addEventListener(name: string, handler: Handler) { this.handlers.set(name, handler); },
  };
  const context = {
    window, innerWidth: width,
    document: {
      body: element(), getElementById: (id: string) => elements[id] ?? null,
      querySelector: () => null, addEventListener() {},
    },
    requestAnimationFrame(callback: Handler) { callback(); return 1; },
  };
  runInNewContext(script, context);
  if (atlas) runInNewContext(initialView, {
    ...context, canvas: window.__adrCanvas, viewport,
    nodes: [{ getBoundingClientRect: () => ({ left: 0, top: 0 }) }], syncRail() {},
  });
  return {
    canvas: window.__adrCanvas!, viewport, world,
    resize: () => window.handlers.get('resize')!(),
    click: (id: string) => elements[id]!.handlers.get('click')!.forEach(handler => handler()),
  };
}

describe.each([
  ['shared', CANVAS_SCRIPT, false], ['atlas', atlasController, true],
] as const)('%s canvas viewport stability', (_name, script, atlas) => {
  it.each([390, 1200])('preserves zoom and pan through height and width changes at %i px', (width) => {
    const { canvas, viewport, world, resize } = controller(script, width, atlas);
    canvas.zoom((width < 760 ? .65 : .85) / canvas.scale);
    canvas.addPan(63, -47);
    const scale = canvas.scale, transform = world.style.transform;
    viewport.clientHeight -= 100; // Mobile browser chrome opening/closing.
    resize();
    expect(canvas.scale).toBe(scale);
    expect(world.style.transform).toBe(transform);
    viewport.clientWidth += 40; // Desktop window resize or rotation.
    resize();
    expect(canvas.scale).toBe(scale);
    expect(world.style.transform).toBe(transform);
  });

  it('keeps explicit Fit and Reset actions working', () => {
    const { canvas, click, resize } = controller(script, 390, atlas);
    click('fit');
    const overview = canvas.scale;
    resize();
    expect(canvas.scale).toBe(overview);
    click('reset');
    expect(canvas.scale).toBeCloseTo(atlas ? .65 : 1);
    click('fit');
    expect(canvas.scale).toBeCloseTo(overview);
  });
});
