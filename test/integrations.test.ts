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
  it('installs the standard .agents integration by default', () => {
    const root = makeTarget();
    initCommand(root);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/skills/adrkit-propose/SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
  });

  it('adds the Claude Code exception with --tools claude', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    expect(existsSync(join(root, '.claude/skills/adrkit-propose/SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/skills/adrkit-propose/SKILL.md'))).toBe(true);
  });

  it('rejects unknown and retired tool ids', () => {
    const root = makeTarget();
    expect(() => initCommand(root, 'not-a-tool')).toThrow(/unknown tool/);
    expect(() => initCommand(root, 'codex')).toThrow(/unknown tool/);
  });

  it('persists tools in config and update rewrites them', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    const config = configCommand(root, true);
    expect(config).toContain('agents');
    const output = updateCommand(root);
    expect(output).toContain(join('.agents', 'commands', 'adrkit-propose.md'));
  });

  it('removes the claude exception when it is no longer selected', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    const output = updateCommand(root, 'agents');
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
    expect(output).toContain('removed integrations for: claude');
  });

  it('clears every integration with --tools none', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    updateCommand(root, 'none');
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/skills/adrkit-propose/SKILL.md'))).toBe(false);
  });

  it('cleans up integration roots when they empty out', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    updateCommand(root, 'agents');
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.claude'))).toBe(false);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
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
});

describe('workflow subsets for tool integrations', () => {
  it('installs only the selected workflows', () => {
    const root = makeTarget();
    initCommand(root, undefined, 'init,decide,validate');
    expect(existsSync(join(root, '.agents/commands/adrkit-decide.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/skills/adrkit-validate/SKILL.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
    expect(readdirSync(join(root, '.agents/skills')).sort()).toEqual([
      'adrkit-decide',
      'adrkit-init',
      'adrkit-validate',
    ]);
  });

  it('records the subset in config and a bare update keeps it', () => {
    const root = makeTarget();
    initCommand(root, undefined, 'decide,validate');
    expect(readConfig(root).workflows).toEqual(['decide', 'validate']);
    updateCommand(root);
    expect(existsSync(join(root, '.agents/commands/adrkit-decide.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
    expect(readConfig(root).workflows).toEqual(['decide', 'validate']);
  });

  it('leaves the config key absent when every workflow installs', () => {
    const root = makeTarget();
    initCommand(root);
    expect(readConfig(root).workflows).toBeUndefined();
  });

  it('config reports the effective workflow selection', () => {
    const root = makeTarget();
    initCommand(root, undefined, 'init,decide,validate');
    const json = JSON.parse(configCommand(root, true)) as { workflows: string[] };
    expect(json.workflows).toEqual(['init', 'decide', 'validate']);
    expect(configCommand(root)).toContain('workflows: init, decide, validate');
  });

  it('config reports the full default set when the key is absent', () => {
    const root = makeTarget();
    initCommand(root);
    const json = JSON.parse(configCommand(root, true)) as { workflows: string[] };
    expect(json.workflows).toHaveLength(7);
    expect(json.workflows).toContain('init');
    expect(json.workflows).toContain('supersede');
    expect(configCommand(root)).toContain('workflows: init');
  });

  it('prunes workflows that are no longer selected', () => {
    const root = makeTarget();
    initCommand(root);
    updateCommand(root, undefined, 'decide');
    expect(existsSync(join(root, '.agents/commands/adrkit-decide.md'))).toBe(true);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.agents/skills/adrkit-propose'))).toBe(false);
    expect(readConfig(root).workflows).toEqual(['decide']);
  });

  it('expands back to the full set with --workflows all', () => {
    const root = makeTarget();
    initCommand(root, undefined, 'decide');
    updateCommand(root, undefined, 'all');
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
    expect(readConfig(root).workflows).toEqual([
      'init',
      'propose',
      'decide',
      'validate',
      'accept',
      'reject',
      'supersede',
    ]);
  });

  it('accepts the adrkit- prefix and returns canonical order', () => {
    const root = makeTarget();
    initCommand(root, undefined, 'validate,adrkit-decide');
    expect(readdirSync(join(root, '.agents/commands')).sort()).toEqual([
      'adrkit-decide.md',
      'adrkit-validate.md',
    ]);
  });

  it('rejects unknown workflow names', () => {
    const root = makeTarget();
    expect(() => initCommand(root, undefined, 'decide,publish')).toThrow(/unknown workflow "publish"/);
  });

  it('rejects an empty workflow selection', () => {
    const root = makeTarget();
    expect(() => initCommand(root, undefined, ' ')).toThrow(/at least one workflow/);
  });

  it('prunes the subset inside the Claude exception too', () => {
    const root = makeTarget();
    initCommand(root, 'claude', 'decide');
    updateCommand(root, 'claude', 'validate');
    expect(existsSync(join(root, '.claude/commands/adrkit-decide.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/adrkit-validate.md'))).toBe(true);
  });
});

describe('update writes the selected tools back to config.yaml', () => {
  it('records the standard target and re-installs it on a bare update', () => {
    const root = makeTarget();
    initCommand(root);
    expect(readConfig(root).tools).toEqual(['agents']);
    updateCommand(root);
    expect(readConfig(root).tools).toEqual(['agents']);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
  });

  it('respects a recorded opt-out on a bare update', () => {
    const root = makeTarget();
    initCommand(root);
    updateCommand(root, 'none');
    expect(readConfig(root).tools).toEqual([]);
    updateCommand(root);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
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
    updateCommand(root);
    const config = readConfig(root);
    expect(config.tools).toEqual(['agents', 'claude']);
    expect(config.context).toContain('Tech stack: TypeScript');
    expect(config.rules?.proposal).toContain('Keep proposals under 500 words.');
    const raw = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
    expect(raw).toContain('# AI tool integrations written by adrkit init --tools.');
    expect(raw).toContain('# managed by adrkit');
  });

  it('defaults to the standard target when the key is missing', () => {
    const root = makeTarget();
    initCommand(root);
    writeFileSync(join(root, 'adr', 'config.yaml'), 'context: |\n  Domain: payments\n');
    updateCommand(root);
    const config = readConfig(root);
    expect(config.tools).toEqual(['agents']);
    expect(config.context).toContain('Domain: payments');
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(true);
  });

  it('--tools none clears skills and records an empty set', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    updateCommand(root, 'none');
    expect(readConfig(root).tools).toEqual([]);
    expect(existsSync(join(root, '.agents/skills/adrkit-propose/SKILL.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/skills/adrkit-propose/SKILL.md'))).toBe(false);
    expect(existsSync(join(root, '.agents/skills'))).toBe(false);
    expect(existsSync(join(root, '.claude/skills'))).toBe(false);
    expect(existsSync(join(root, '.agents/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.claude/commands/adrkit-propose.md'))).toBe(false);
    expect(existsSync(join(root, '.agents'))).toBe(false);
    expect(existsSync(join(root, '.claude'))).toBe(false);
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
    expect(accept?.body).toMatch(/even if you\s+reviewed it earlier in this conversation/);
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
