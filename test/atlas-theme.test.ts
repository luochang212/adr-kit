import { describe, expect, it, vi } from 'vitest';
import { randomInt } from 'node:crypto';
import { selectAtlasTheme } from '../src/core/atlas-theme.js';
import { selectSiteTheme, SITE_PAGES, SITE_THEMES } from '../tools/build-decision-atlas.mjs';

vi.mock('node:crypto', () => ({ randomInt: vi.fn() }));

describe('generation-time atlas theme selection', () => {
  it.each(['folio', 'signal'] as const)('keeps an explicit %s choice without rolling', theme => {
    vi.mocked(randomInt).mockClear();
    expect(selectAtlasTheme(theme)).toBe(theme);
    expect(randomInt).not.toHaveBeenCalled();
  });

  it.each([undefined, 'random'])('resolves both outcomes of %s exactly once', selection => {
    vi.mocked(randomInt).mockClear();
    vi.mocked(randomInt).mockReturnValueOnce(0);
    expect(selectAtlasTheme(selection)).toBe('folio');
    expect(randomInt).toHaveBeenCalledExactlyOnceWith(2);
    vi.mocked(randomInt).mockClear();
    vi.mocked(randomInt).mockReturnValueOnce(1);
    expect(selectAtlasTheme(selection)).toBe('signal');
    expect(randomInt).toHaveBeenCalledExactlyOnceWith(2);
  });

  it.each(['auto', 'light', 'dark', '', 'Folio'])('rejects unsupported selection %j', selection => {
    expect(() => selectAtlasTheme(selection)).toThrow('--theme expects folio, signal, random');
  });
});

describe('the published site serves both themes in both languages', () => {
  it('accepts either named theme without rolling', () => {
    expect(SITE_PAGES).toEqual([
      { theme: 'folio', language: 'zh', file: 'index.html' },
      { theme: 'folio', language: 'en', file: 'en.html' },
      { theme: 'signal', language: 'zh', file: 'signal.html' },
      { theme: 'signal', language: 'en', file: 'signal.en.html' },
    ]);
    for (const theme of SITE_THEMES) expect(selectSiteTheme(theme)).toBe(theme);
    expect(selectSiteTheme()).toBe('folio');
  });

  it.each(['random', 'auto', ''])('rejects %j: a roll belongs to the CLI, not a build', selection => {
    expect(() => selectSiteTheme(selection)).toThrow('the site publishes folio or signal');
  });
});
