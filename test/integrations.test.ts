import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { completionCommand } from '../src/commands/completion.js';
import { configCommand } from '../src/commands/config.js';
import { initCommand } from '../src/commands/init.js';
import { updateCommand } from '../src/commands/update.js';
import { readConfig } from '../src/core/config.js';
import { WORKFLOWS } from '../src/core/tool-integrations.js';

const tempDirs: string[] = [];

function makeTarget(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adrkit-tools-'));
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
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(true);
    expect(existsSync(join(root, '.claude/commands/adrkit-supersede.md'))).toBe(true);
    expect(existsSync(join(root, '.codex/commands/adrkit-validate.md'))).toBe(true);
    expect(existsSync(join(root, '.cursor/commands/adrkit-accept.md'))).toBe(false);
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
    expect(output).toContain(join('.claude', 'commands', 'adrkit-propose.md'));
  });

  it('removes integrations for tools no longer selected', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    const output = updateCommand(root, 'codex');
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.codex/commands/adrkit-propose.md'))).toBe(true);
    expect(output).toContain('removed integrations for: claude');
  });

  it('clears every integration with --tools none', () => {
    const root = makeTarget();
    initCommand(root, 'claude,codex');
    updateCommand(root, 'none');
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.codex/commands/adrkit-propose.md'))).toBe(false);
  });

  it('installs skills alongside commands', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    const installed = readFileSync(join(root, '.claude/skills/adrkit-propose/SKILL.md'), 'utf8');
    const skillsDir = fileURLToPath(new URL('../skills/', import.meta.url));
    const source = readFileSync(join(skillsDir, 'adrkit-propose', 'SKILL.md'), 'utf8');
    expect(installed).toBe(source);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(true);
  });

  it('does not install skills for github-copilot (prompts only)', () => {
    const root = makeTarget();
    initCommand(root, 'github-copilot');
    expect(existsSync(join(root, '.github/prompts/adrkit-init.md'))).toBe(true);
    expect(existsSync(join(root, '.github/skills'))).toBe(false);
  });
});

describe('update writes the selected tools back to config.yaml', () => {
  it('persists the new tool set and a bare update re-installs it', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    updateCommand(root, 'codex');
    expect(readConfig(root).tools).toEqual(['codex']);
    updateCommand(root);
    expect(readConfig(root).tools).toEqual(['codex']);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.codex/commands/adrkit-propose.md'))).toBe(true);
  });

  it('preserves context, rules, and comments when rewriting tools', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    writeFileSync(
      join(root, 'adr', 'config.yaml'),
      `# ADR Kit configuration
context: |
  Tech stack: TypeScript

# AI tool integrations written by adrkit init --tools.
tools: [claude] # managed by adrkit

# Optional per-status conventions.
rules:
  proposal:
    - Keep proposals under 500 words.
`,
    );
    updateCommand(root, 'codex');
    const config = readConfig(root);
    expect(config.tools).toEqual(['codex']);
    expect(config.context).toContain('Tech stack: TypeScript');
    expect(config.rules?.proposal).toContain('Keep proposals under 500 words.');
    const raw = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
    expect(raw).toContain('# AI tool integrations written by adrkit init --tools.');
    expect(raw).toContain('# managed by adrkit');
  });

  it('appends tools when the key is missing', () => {
    const root = makeTarget();
    initCommand(root);
    writeFileSync(join(root, 'adr', 'config.yaml'), 'context: |\n  Domain: payments\n');
    updateCommand(root, 'codex');
    const config = readConfig(root);
    expect(config.tools).toEqual(['codex']);
    expect(config.context).toContain('Domain: payments');
  });

  it('--tools none clears skills and records an empty set', () => {
    const root = makeTarget();
    initCommand(root, 'claude,codex');
    updateCommand(root, 'none');
    expect(readConfig(root).tools).toEqual([]);
    expect(existsSync(join(root, '.claude/skills/adrkit-propose/SKILL.md'))).toBe(false);
    expect(existsSync(join(root, '.codex/skills/adrkit-propose/SKILL.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/skills'))).toBe(false);
    expect(existsSync(join(root, '.codex/skills'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.codex/commands/adrkit-propose.md'))).toBe(false);
  });

  it('propose workflow guides a supersession check', () => {
    const propose = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-propose');
    expect(propose?.body).toContain('adrkit list');
    expect(propose?.body).toContain('supersedes or overlaps');
  });

  it('decision-point workflows require re-querying the repo state', () => {
    const propose = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-propose');
    const accept = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-accept');
    const supersede = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-supersede');
    expect(propose?.body).toContain('even if you ran it earlier in this conversation');
    expect(accept?.body).toMatch(/even if you\s+validated earlier in this conversation/);
    expect(supersede?.body).toMatch(/even if you\s+checked earlier in\s+this conversation/);
  });
});

describe('skills/ stays in sync with the tool integration templates', () => {
  const skillsDir = fileURLToPath(new URL('../skills/', import.meta.url));

  it('every template mirrors its skill file exactly', () => {
    for (const workflow of WORKFLOWS) {
      const path = join(skillsDir, workflow.name, 'SKILL.md');
      const expected = `---\nname: ${workflow.name}\ndescription: ${workflow.description}\n---\n\n${workflow.body}\n`;
      expect(readFileSync(path, 'utf8'), workflow.name).toBe(expected);
    }
  });

  it('every skill directory has a matching template', () => {
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(dirs).toEqual(WORKFLOWS.map((workflow) => workflow.name).sort());
  });
});

describe('completionCommand', () => {
  it('prints bash completion', () => {
    expect(completionCommand('bash')).toContain('complete -F _adrkit_completion adrkit');
  });

  it('rejects unsupported shells', () => {
    expect(() => completionCommand('powershell')).toThrow(/unsupported shell/);
  });
});
