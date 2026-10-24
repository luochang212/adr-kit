import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8');
}

describe('VERSION', () => {
  it('matches the package.json version so the CLI never misreports', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });
});

describe('package keywords', () => {
  it('lists the command name so npm search by "adrkit" finds adr-kit', () => {
    const pkg = JSON.parse(read('package.json')) as { keywords: string[] };
    expect(pkg.keywords).toContain('adrkit');
  });
});

describe('Node.js floor', () => {
  it('states the package.json engine floor in both READMEs', () => {
    const pkg = JSON.parse(read('package.json')) as { engines: { node: string } };
    const floor = pkg.engines.node.replace(/^>=/, '').replace(/\.0$/, '');
    expect(read('README.md')).toContain(`Requires Node.js ${floor} or later.`);
    expect(read('README.zh.md')).toContain(`需要 Node.js ${floor} 或更新版本。`);
  });
});
