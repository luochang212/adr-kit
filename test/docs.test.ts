import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMMAND_OPTIONS, COMMANDS } from '../src/core/cli-options.js';
import { WORKFLOWS } from '../src/core/tool-integrations.js';

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

describe('bilingual lifecycle documentation', () => {
  for (const file of [
    'README.md',
    'README.zh.md',
    'docs/cli.md',
    'docs/zh/cli.md',
    'docs/record-format.md',
    'docs/zh/record-format.md',
    'docs/workflow.md',
    'docs/zh/workflow.md',
  ]) {
    it(`${file} describes the four durable folders without the old model`, () => {
      const document = read(file);
      for (const folder of ['proposed/', 'implemented/', 'rejected/', 'archived/']) {
        expect(document, file).toContain(folder);
      }
      expect(document, file).not.toContain('adr/decisions/');
      expect(document, file).not.toContain('adr/.drafts/');
      expect(document, file).not.toContain('adrkit accept');
      expect(document, file).not.toContain('adrkit decide');
    });
  }

  it('describes assignment, rejection, and archival in both record references', () => {
    for (const file of ['docs/record-format.md', 'docs/zh/record-format.md']) {
      const document = read(file);
      expect(document).toContain('YYYY-MM-DD-slug.md');
      expect(document).toContain('N-slug.md');
      expect(document).toContain('superseded-by');
      expect(document).toContain('archive-reason');
      expect(document).toContain('raised-by');
      expect(document).toContain('decided-by');
    }
  });

  it('uses the ADR 33 deliberation-tree term in Chinese docs', () => {
    for (const file of [
      'README.zh.md',
      'docs/zh/cli.md',
      'docs/zh/record-format.md',
      'docs/zh/upgrading.md',
      'docs/zh/workflow.md',
    ]) {
      expect(read(file), file).not.toMatch(/推敲树|商议树/);
    }
  });

  it('documents the promoted Consequences subsections in both languages', () => {
    for (const file of [
      'README.md',
      'README.zh.md',
      'docs/record-format.md',
      'docs/zh/record-format.md',
    ]) {
      const document = read(file);
      expect(document, file).toContain('### Verification');
      expect(document, file).toContain('### Trade-offs');
    }
  });

  it('documents the complete CLI surface in both languages', () => {
    for (const file of ['docs/cli.md', 'docs/zh/cli.md']) {
      const document = read(file);
      for (const command of COMMANDS) {
        expect(document, `${file}: ${command}`).toContain(`adrkit ${command}`);
      }
      for (const command of ['reject', 'archive']) {
        expect(COMMAND_OPTIONS[command]).toContain('--reason');
        expect(document).toContain(`adrkit ${command} <name> --reason <text>`);
      }
    }
  });
});

describe('agent-facing front door', () => {
  it('llms.txt uses only real commands and describes the new lifecycle', () => {
    const document = read('site/public/llms.txt');
    for (const folder of ['proposed', 'implemented', 'rejected', 'archived']) {
      expect(document).toContain(folder);
    }
    for (const match of document.matchAll(/`?adrkit ([a-z][a-z-]*)/g)) {
      expect(COMMANDS as readonly string[]).toContain(match[1]);
    }
    expect(document).not.toContain('adr/.drafts/');
    // ADR 42 replaced the even roll; the agent-facing file is a front door.
    expect(document).toContain('Folio 30%');
    expect(document).toContain('Signal 70%');
    expect(document).not.toContain('equal probability');
  });

  it('site stats count the installed workflow skills in both languages', () => {
    const copy = read('site/src/i18n/ui.ts');
    const values = [...copy.matchAll(/'stats\.2\.value': "(\d+)"/g)].map((match) => match[1]);
    expect(values).toHaveLength(2);
    for (const value of values) expect(value).toBe(String(WORKFLOWS.length));
  });

  it('site ui defines the same keys in both languages', () => {
    const copy = read('site/src/i18n/ui.ts');
    const block = (lang: string) => {
      const start = copy.indexOf(`\n  ${lang}: {`);
      const end = copy.indexOf('\n  },', start);
      return copy.slice(start, end);
    };
    const keys = (text: string) => new Set([...text.matchAll(/^    '([^']+)':/gm)].map((match) => match[1]));
    const en = keys(block('en'));
    const zh = keys(block('zh'));
    expect([...en].filter((key) => !zh.has(key))).toEqual([]);
    expect([...zh].filter((key) => !en.has(key))).toEqual([]);
  });

  it('the README and social banners show the four-folder lifecycle', () => {
    const oldStrip = 'draft <tspan fill="#22D3EE">&#8594;</tspan> accepted <tspan fill="#22D3EE">&#8594;</tspan> superseded';
    const newStrip = 'proposed <tspan fill="#22D3EE">&#8594;</tspan> implemented <tspan fill="#22D3EE">&#8594;</tspan> archived';
    for (const file of ['assets/readme-banner.svg', 'assets/social-preview.svg']) {
      const svg = read(file);
      expect(svg, file).toContain(newStrip);
      expect(svg, file).not.toContain(oldStrip);
    }
  });

  it('site copy agrees in both languages about the four folders and targets', () => {
    const copy = read('site/src/i18n/ui.ts');
    for (const folder of ['proposed', 'implemented', 'rejected', 'archived']) {
      expect(copy.split(folder).length - 1).toBeGreaterThanOrEqual(2);
    }
    for (const target of ['.agents/', '.claude/']) {
      expect(copy.split(target).length - 1).toBeGreaterThanOrEqual(2);
    }
  });
});


describe('change-context documentation', () => {
  it('documents both Git modes and coverage limits in both languages', () => {
    for (const file of ['README.md', 'README.zh.md', 'docs/cli.md', 'docs/zh/cli.md', 'docs/workflow.md', 'docs/zh/workflow.md']) {
      const text = read(file);
      expect(text, file).toContain('adrkit relevant --base');
      expect(text, file).toContain('adrkit relevant --staged');
    }
    for (const file of ['docs/cli.md', 'docs/zh/cli.md']) {
      expect(read(file)).toContain('2,000');
    }
  });
});
