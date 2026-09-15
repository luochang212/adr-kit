import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AGENT_ENV_MARKERS, detectDecidedBy } from '../src/core/execution-env.js';

describe('detectDecidedBy', () => {
  it('stamps human for an empty environment', () => {
    expect(detectDecidedBy({})).toBe('human');
  });

  it('stamps machine for every known agent marker', () => {
    for (const marker of AGENT_ENV_MARKERS) {
      expect(detectDecidedBy({ [marker]: '1' })).toBe('machine');
    }
  });

  it('ignores unrelated variables, including git ones', () => {
    expect(detectDecidedBy({ PATH: '/usr/bin', GIT_AUTHOR_NAME: 'alex' })).toBe('human');
  });

  it('ignores an empty or blank marker value', () => {
    expect(detectDecidedBy({ CLAUDECODE: '' })).toBe('human');
    expect(detectDecidedBy({ CLAUDECODE: '   ' })).toBe('human');
  });

  it('is a pure function of the mapping it receives', () => {
    const env: Record<string, string | undefined> = {};
    expect(detectDecidedBy(env)).toBe('human');
    env['AGENT'] = 'dsh';
    expect(detectDecidedBy(env)).toBe('machine');
  });

  it('reads no process argument vector', () => {
    const source = readFileSync(join(import.meta.dirname, '../src/core/execution-env.ts'), 'utf8');
    expect(source).not.toMatch(/process\.argv/);
  });
});
