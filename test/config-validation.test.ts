import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { instructionsCommand } from '../src/commands/instructions.js';
import { listCommand } from '../src/commands/list.js';
import { proposeCommand } from '../src/commands/propose.js';
import { updateCommand } from '../src/commands/update.js';
import { validateCommand } from '../src/commands/validate.js';
import { readConfig } from '../src/core/config.js';
import { initRepository } from '../src/core/repository.js';

const roots: string[] = [];
function repo(config: string): string {
  const root = mkdtempSync(join(tmpdir(), 'adrkit-config-'));
  roots.push(root);
  initRepository(root);
  writeFileSync(join(root, 'adr', 'config.yaml'), config);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('configuration type validation', () => {
  it.each([
    ['context: [TypeScript]', 'context', 'string'],
    ['context: null', 'context', 'string'],
    ['installed-with: 14', 'installed-with', 'string'],
    ['installed-with: null', 'installed-with', 'string'],
    ['tools: agents', 'tools', 'list of strings'],
    ['tools: [agents, 42]', 'tools[1]', 'string'],
    ['tools: null', 'tools', 'list of strings'],
    ['workflows: propose', 'workflows', 'list of strings'],
    ['workflows: [propose, false]', 'workflows[1]', 'string'],
    ['workflows: null', 'workflows', 'list of strings'],
    ['rules: []', 'rules', 'mapping'],
    ['rules: null', 'rules', 'mapping'],
    ['rules:\n  proposal: short', 'rules.proposal', 'list of strings'],
    ['rules:\n  proposal: null', 'rules.proposal', 'list of strings'],
    ['rules:\n  proposal: [short, 500]', 'rules.proposal[1]', 'string'],
    ['rules:\n  proposal: [short, null]', 'rules.proposal[1]', 'string'],
  ])('reports invalid field types for %s', (input, field, expected) => {
    const result = validateCommand(repo(input + '\n'));
    expect(result.valid).toBe(false);
    expect(result.output).toContain('adr/config.yaml');
    expect(result.output).toContain(field);
    expect(result.output).toContain(expected);
  });

  it('reports every bad list item and explains YAML mappings', () => {
    const root = repo('rules:\n  proposal:\n    - Keep it short\n    - max: 500\n    - false\n');
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('rules.proposal[1]');
    expect(result.output).toContain('rules.proposal[2]');
    expect(result.output).toContain('quote');
    expect(validateCommand(repo('rules:\n  proposal:\n    - Keep it short\n    - "max: 500"\n')).valid).toBe(true);
  });

  it.each(['{}\n', 'context: ""\ntools: []\nworkflows: []\nrules: {}\n',
    'rules:\n  proposal: []\n  custom: ["arbitrary prose: no enforcement"]\nextension: [1, false]\n'])
  ('accepts optional fields, empty containers and extension data: %s', (input) => {
    expect(validateCommand(repo(input))).toEqual({ valid: true, output: 'OK' });
  });

  it('keeps tolerant reads and reports issues even with a pending proposal', () => {
    const root = repo('context: Example\nworkflows: propose\n');
    proposeCommand('Use SQLite', root);
    expect(readConfig(root)).toEqual({ context: 'Example' });
    expect(listCommand(root)).toContain('Use SQLite');
    expect(instructionsCommand(root)).toContain('workflows');
    expect(instructionsCommand(root)).toContain('adr/config.yaml');
  });

  it('preserves comments and unknown keys when integrations are updated', () => {
    const root = repo('# project note\ntools: []\nworkflows: [propose]\nextension: [1, false]\n');
    updateCommand(root);
    const config = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
    expect(config).toContain('# project note');
    expect(parse(config).extension).toEqual([1, false]);
    expect(validateCommand(root).valid).toBe(true);
  });

  it('escapes control characters in rule group names in diagnostics', () => {
    const root = repo('rules:\n  "bad\\u001b[31m\\u0085name": [false]\n');
    const output = validateCommand(root).output;
    expect(output).toContain('string');
    expect(output).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
  });
});
