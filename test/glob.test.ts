import { describe, expect, it } from 'vitest';
import { globMatches, staticPrefix } from '../src/core/glob.js';

describe('globMatches', () => {
  it('crosses directory separators only for **', () => {
    expect(globMatches('src/core/**', 'src/core/adr.ts')).toBe(true);
    expect(globMatches('src/core/**', 'src/core/deep/nested/adr.ts')).toBe(true);
    expect(globMatches('src/core/**', 'src/commands/list.ts')).toBe(false);
  });

  it('keeps * inside one segment', () => {
    expect(globMatches('src/*.ts', 'src/cli.ts')).toBe(true);
    expect(globMatches('src/*.ts', 'src/core/adr.ts')).toBe(false);
    expect(globMatches('docs/*.md', 'docs/record-format.md')).toBe(true);
  });

  it('matches exactly one character with ?', () => {
    expect(globMatches('test/*.test.ts', 'test/glob.test.ts')).toBe(true);
    expect(globMatches('src/???.ts', 'src/cli.ts')).toBe(true);
    expect(globMatches('src/???.ts', 'src/core.ts')).toBe(false);
  });

  it('matches a leading ** against a bare filename', () => {
    expect(globMatches('**/*.test.ts', 'glob.test.ts')).toBe(true);
    expect(globMatches('**/*.test.ts', 'test/glob.test.ts')).toBe(true);
    expect(globMatches('**/*.test.ts', 'test/glob.ts')).toBe(false);
  });

  it('treats regex syntax bytes literally', () => {
    expect(globMatches('docs/v1.0.md', 'docs/v1.0.md')).toBe(true);
    expect(globMatches('docs/v1.0.md', 'docs/v1x0.md')).toBe(false);
    expect(globMatches('a+b.md', 'a+b.md')).toBe(true);
    expect(globMatches('a+b.md', 'aab.md')).toBe(false);
  });

  it('preserves newline filenames without treating trailing newlines as end-of-path', () => {
    expect(globMatches('src/**', 'src/line\nbreak.ts')).toBe(true);
    expect(globMatches('**/*.ts', 'line\nbreak/child.ts')).toBe(true);
    expect(globMatches('src/exact.ts', 'src/exact.ts\n')).toBe(false);
  });

  it('matches an exact path with no wildcard', () => {
    expect(globMatches('src/core/adr.ts', 'src/core/adr.ts')).toBe(true);
    expect(globMatches('src/core/adr.ts', 'src/core/adr.tsx')).toBe(false);
  });
});

describe('staticPrefix', () => {
  it('strips the wildcard tail and trailing separator', () => {
    expect(staticPrefix('src/core/**')).toBe('src/core');
    expect(staticPrefix('src/core/*')).toBe('src/core');
    expect(staticPrefix('src/?.ts')).toBe('src');
  });

  it('returns the whole pattern when it is literal', () => {
    expect(staticPrefix('src/core/adr.ts')).toBe('src/core/adr.ts');
  });

  it('returns the empty string when nothing is checkable', () => {
    expect(staticPrefix('**/*.ts')).toBe('');
    expect(staticPrefix('*.md')).toBe('');
  });
});
