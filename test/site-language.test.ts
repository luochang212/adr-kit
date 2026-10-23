import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(new URL('../site/src/layouts/Base.astro', import.meta.url), 'utf8');
const script = layout.match(/<script\b[^>]*data-language-redirect[^>]*>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Homepage language script is missing');

function visit({
  path = '/adr-kit/',
  saved,
  languages = ['en-US'],
  language = 'en-US',
  storageBlocked = false,
  basePath = '/adr-kit/',
}: {
  path?: string;
  saved?: string;
  languages?: string[] | null;
  language?: string;
  storageBlocked?: boolean;
  basePath?: string;
} = {}) {
  const redirects: string[] = [];
  const values = new Map<string, string>();
  if (saved !== undefined) values.set('adr-kit.language', saved);
  const context = {
    URL,
    basePath,
    location: {
      href: `https://example.com${path}`,
      replace: (target: string) => redirects.push(target),
    },
    navigator: { languages, language },
    get localStorage() {
      if (storageBlocked) throw new Error('Storage is unavailable');
      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      };
    },
  };
  runInNewContext(script!, context);
  return { redirects, saved: values.get('adr-kit.language') };
}

describe('homepage language selection', () => {
  it.each([
    [['zh-CN', 'en'], '/adr-kit/zh/'],
    [['zh-Hant-TW'], '/adr-kit/zh/'],
    [['en-GB', 'zh-CN'], null],
    [['fr', 'zh-HK', 'en'], '/adr-kit/zh/'],
    [['fr', 'en', 'zh'], null],
    [['ja', 'de'], null],
    [['zhongwen', 'english'], null],
    [['ZH-cn'], '/adr-kit/zh/'],
  ] as const)('uses the first supported browser preference: %j', (languages, target) => {
    const { redirects } = visit({ languages: [...languages] });
    expect(redirects).toEqual(target ? [`https://example.com${target}`] : []);
  });

  it.each([null, []])('falls back to navigator.language when languages is %j', (languages) => {
    expect(visit({ languages, language: 'zh-CN' }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/']);
  });

  it('uses a saved manual preference before browser preferences', () => {
    expect(visit({ saved: 'en', languages: ['zh'] }).redirects).toEqual([]);
    expect(visit({ saved: 'zh' }).redirects).toEqual(['https://example.com/adr-kit/zh/']);
    expect(visit({ saved: 'fr', languages: ['zh'] }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/']);
  });

  it('respects direct Chinese links without replacing a saved preference', () => {
    expect(visit({ path: '/adr-kit/zh/', saved: 'en' }))
      .toEqual({ redirects: [], saved: 'en' });
  });

  it('persists explicit switches and lets them override stored and browser preferences', () => {
    expect(visit({ path: '/adr-kit/?lang=en', saved: 'zh', languages: ['zh'] }))
      .toEqual({ redirects: [], saved: 'en' });
    expect(visit({ path: '/adr-kit/zh/?lang=zh', saved: 'en' }))
      .toEqual({ redirects: [], saved: 'zh' });
    expect(visit({ path: '/adr-kit/?lang=zh', saved: 'en' }))
      .toEqual({ redirects: ['https://example.com/adr-kit/zh/?lang=zh'], saved: 'zh' });
  });

  it('ignores invalid explicit language values', () => {
    expect(visit({ path: '/adr-kit/?lang=fr', languages: ['zh'] }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/?lang=fr']);
  });

  it('keeps automatic and manual selection working when storage access throws', () => {
    expect(visit({ languages: ['zh'], storageBlocked: true }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/']);
    expect(visit({ path: '/adr-kit/?lang=en', languages: ['zh'], storageBlocked: true }).redirects)
      .toEqual([]);
    expect(visit({ path: '/adr-kit/zh/?lang=zh', storageBlocked: true }).redirects)
      .toEqual([]);
  });

  it('preserves search and fragment and does not redirect again at the target', () => {
    const { redirects } = visit({ path: '/adr-kit/?ref=readme#faq', languages: ['zh'] });
    expect(redirects).toEqual(['https://example.com/adr-kit/zh/?ref=readme#faq']);
    const target = new URL(redirects[0]);
    expect(visit({ path: target.pathname + target.search + target.hash, languages: ['zh'] }).redirects)
      .toEqual([]);
  });

  it.each(['/adr-kit', '/adr-kit/index.html'])('handles the default entry alias %s', (path) => {
    expect(visit({ path, languages: ['zh'] }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/']);
  });

  it('uses the configured base path for both subpath and root deployments', () => {
    expect(visit({ basePath: '/adr-kit', languages: ['zh'] }).redirects)
      .toEqual(['https://example.com/adr-kit/zh/']);
    expect(visit({ path: '/', basePath: '/', languages: ['zh'] }).redirects)
      .toEqual(['https://example.com/zh/']);
  });

  it.each(['/adr-kit/decisions/', '/adr-kit/zh/other/', '/elsewhere/'])('leaves other paths alone: %s', (path) => {
    expect(visit({ path: `${path}?lang=zh`, saved: 'en' }))
      .toEqual({ redirects: [], saved: 'en' });
  });

  it('runs before page content and makes language links explicit without requiring a click handler', () => {
    expect(layout.indexOf('data-language-redirect')).toBeLessThan(layout.indexOf('<title>'));
    const nav = readFileSync(new URL('../site/src/components/Nav.astro', import.meta.url), 'utf8');
    expect(nav).toContain('href={`${langPath(other, \'/\')}?lang=${other}`}');
  });
});
