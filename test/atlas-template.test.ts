import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANVAS_STYLE } from '../src/core/canvas-view.js';
import { RELATION_STYLE, RELATION_SCRIPT } from '../src/core/relation-focus.js';
import { SHARE_SCRIPT, SHARE_STYLE } from '../src/core/share.js';
import { ATLAS_EN } from '../src/core/atlas-i18n.js';

// The shipped example is the site build's frontend: build-decision-atlas.mjs
// fills its slots, so the shared canvas contract it embeds must stay byte-equal
// to the constants the CLI renders with. CANVAS_SCRIPT is deliberately forked
// (in-document pan bounds and touch handling) and is covered by the behavioral
// equivalence test in canvas-view.test.ts instead.
const template = readFileSync(
  fileURLToPath(new URL('../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url)),
  'utf8',
);

describe('decision-atlas template mirrors the shared contract', () => {
  it.each([
    ['CANVAS_STYLE', CANVAS_STYLE],
    ['SHARE_STYLE', SHARE_STYLE],
    ['SHARE_SCRIPT', SHARE_SCRIPT],
    ['RELATION_STYLE', RELATION_STYLE],
    ['RELATION_SCRIPT', RELATION_SCRIPT],
  ])('embeds %s verbatim', (name, constant) => {
    expect(template.includes(constant), `${name} must be copied into the template byte for byte`).toBe(true);
  });

  it('guards the empty-canvas initial view', () => {
    expect(template).toContain('if (nodes.length === 0) return;');
  });

  it('carries every translation key, so the table holds no dead entries', () => {
    for (const [zh] of ATLAS_EN) {
      expect(template.includes(zh), `translation key "${zh}" no longer appears in the template`).toBe(true);
    }
    // The runtime-joined full-width comma is a translation target too.
    expect(template).toContain('，');
  });
});
