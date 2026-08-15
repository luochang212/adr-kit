import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { completionCommand } from '../src/commands/completion.js';
import { configCommand } from '../src/commands/config.js';
import { initCommand } from '../src/commands/init.js';
import { updateCommand } from '../src/commands/update.js';

const tempDirs: string[] = [];

function makeTarget(): string {
  const dir = mkdtempSync(join(tmpdir(), 'openadr-tools-'));
  tempDirs.push(dir);
  return join(dir, 'project');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('initCommand tool integrations', () => {
  it('writes command files for selected tools', () => {
    const root = makeTarget();
    initCommand(root, 'claude,codex');
    expect(existsSync(join(root, '.claude/commands/openadr-propose.md'))).toBe(true);
    expect(existsSync(join(root, '.codex/commands/openadr-validate.md'))).toBe(true);
    expect(existsSync(join(root, '.cursor/commands/openadr-accept.md'))).toBe(false);
  });

  it('rejects unknown tools', () => {
    const root = makeTarget();
    expect(() => initCommand(root, 'not-a-tool')).toThrow(/unknown tool/);
  });

  it('persists tools in config and update rewrites them', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    const config = configCommand(root, true);
    expect(config).toContain('claude');
    const output = updateCommand(root);
    expect(output).toContain('.claude/commands/openadr-propose.md');
  });
});

describe('completionCommand', () => {
  it('prints bash completion', () => {
    expect(completionCommand('bash')).toContain('complete -F _openadr_completion openadr');
  });

  it('rejects unsupported shells', () => {
    expect(() => completionCommand('powershell')).toThrow(/unsupported shell/);
  });
});
