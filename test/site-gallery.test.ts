import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pngDimensions, screenshotFor, SITE_PAGES, SITE_THEMES } from '../tools/build-decision-atlas.mjs';
import { renderThemePreview } from '../tools/atlas-preview.mjs';

// The gallery reserves each screenshot's space from its declared width and
// height. A reservation that drifts from the PNG's true ratio shifts the
// cards the moment the image decodes on a phone, so the declared size must
// come from the file itself, never from a captured constant.
describe('the theme gallery reserves its screenshots from their own headers', () => {
  it('declares the intrinsic PNG size for every theme and language', () => {
    for (const language of ['zh', 'en']) {
      const screenshots = Object.fromEntries(SITE_THEMES.map(theme => [theme, screenshotFor(theme, language)]));
      const html = renderThemePreview({ language, pages: SITE_PAGES, screenshots, favicon: 'data:image/svg+xml,' });
      for (const theme of SITE_THEMES) {
        const { width, height } = pngDimensions(join(process.cwd(), 'assets', `decision-atlas-${theme}${language === 'zh' ? '.zh' : ''}.png`));
        expect(html).toContain(`width="${width}" height="${height}"`);
      }
    }
  });
});
