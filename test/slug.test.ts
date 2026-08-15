import { describe, expect, it } from 'vitest';
import { slugify } from '../src/core/slug.js';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Use SQLite for Storage')).toBe('use-sqlite-for-storage');
  });

  it('keeps CJK characters', () => {
    expect(slugify('使用 SQLite 存储')).toBe('使用-sqlite-存储');
  });

  it('strips punctuation', () => {
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
  });

  it('falls back for empty input', () => {
    expect(slugify('!!!')).toBe('untitled');
  });
});
