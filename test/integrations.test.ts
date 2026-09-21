import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { completionCommand } from '../src/commands/completion.js';
import { configCommand } from '../src/commands/config.js';
import { initCommand } from '../src/commands/init.js';
import { updateCommand } from '../src/commands/update.js';
import { readConfig } from '../src/core/config.js';
import { WORKFLOWS, WORKFLOW_NAMES } from '../src/core/tool-integrations.js';

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
  it('installs and refreshes reading guidance without replacing project instructions', () => {
    const root = makeTarget();
    initCommand(root, 'claude');
    for (const file of ['AGENTS.md', 'CLAUDE.md']) {
      writeFileSync(join(root, file), '# Existing project instructions\n');
    }
    for (const target of ['.agents', '.claude']) {
      const skill = join(root, target, 'skills/adrkit-init/SKILL.md');
      expect(readFileSync(skill, 'utf8')).toContain('At the start of a coding, design, or review task');
      writeFileSync(skill, 'old installed skill');
    }
    updateCommand(root);
    for (const target of ['.agents', '.claude']) {
      const init = readFileSync(join(root, target, 'skills/adrkit-init/SKILL.md'), 'utf8');
      expect(init).toContain('read every decision in full');
      expect(init).toContain('update an equivalent section');
      expect(init).toContain('reading does not require creating an ADR');
      expect(init).toContain('Record an ADR when an architectural choice will constrain future development');
      expect(init).toContain('do not invent reasons');
      expect(init).toContain('not proof of human review');
      expect(init).toContain('is a declaration of where the');
      expect(init).toContain('including when a person only let it through');
      for (const workflow of ['propose', 'decide']) {
        const command = readFileSync(join(root, target, `commands/adrkit-${workflow}.md`), 'utf8');
        expect(command).toContain('adrkit show <N>');
        expect(command).toContain('current code and requirements');
        expect(command).toContain('Reuse an existing decision');
        expect(command).toContain('whose rationale is not apparent from code alone');
        expect(command).toContain('local fixes, and easily reversible choices need no ADR');
      }
    }
    for (const file of ['AGENTS.md', 'CLAUDE.md']) {
      expect(readFileSync(join(root, file), 'utf8')).toBe('# Existing project instructions\n');
    }
  });

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
    const config = configCommand(root);
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
    expect(configCommand(root)).toContain('workflows: init, decide, validate');
  });

  it('config reports the full default set when the key is absent', () => {
    const root = makeTarget();
    initCommand(root);
    // An absent key means the full set, and the report must name every workflow
    // so `config` never hides what `update` would install.
    expect(configCommand(root)).toContain(`workflows: ${WORKFLOW_NAMES.join(', ')}`);
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
      'grill',
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

  it('a bare update leaves a fresh init config byte-identical', () => {
    // init writes the config from a hand template while update rewrites it
    // through the yaml library: the two emitters must agree byte for byte,
    // or every new repository sees a spurious config diff on its first
    // bare `adrkit update` (`[agents]` -> `[ agents ]`).
    const cases: Array<[string | undefined, string | undefined]> = [
      [undefined, undefined],
      ['claude', undefined],
      ['none', undefined],
      [undefined, 'init,decide,validate'],
      ['claude', 'decide'],
    ];
    for (const [tools, workflows] of cases) {
      const root = makeTarget();
      initCommand(root, tools, workflows);
      const before = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
      updateCommand(root);
      const after = readFileSync(join(root, 'adr', 'config.yaml'), 'utf8');
      expect(after, `tools=${tools} workflows=${workflows}`).toBe(before);
    }
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
    const grill = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-grill');
    const propose = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-propose');
    const accept = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-accept');
    const supersede = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-supersede');
    expect(grill?.body).toContain('even if you ran it earlier in this conversation');
    expect(propose?.body).toContain('even if you ran it earlier in this conversation');
    expect(accept?.body).toMatch(/even if you\s+reviewed it earlier in this conversation/);
    expect(supersede?.body).toMatch(/even if you\s+checked earlier in\s+this conversation/);
  });

  it('grill workflow interrogates before it records', () => {
    // The skill must carry the method (tree, frontier), credit its source,
    // and end in the CLI instead of free-form notes.
    const grill = WORKFLOWS.find((workflow) => workflow.name === 'adrkit-grill');
    expect(grill?.body).toContain('design tree');
    expect(grill?.body).toContain('frontier');
    expect(grill?.body).toContain('mattpocock/skills');
    expect(grill?.body).toContain('Never ask the user for a fact');
    expect(grill?.body).toContain('--decided-by');
    expect(grill?.body).toContain('adrkit validate <N>');
    expect(grill?.body).toContain('--raised-by');
    expect(grill?.body).toContain('## Deliberation');
    expect(grill?.body).toContain('no record-time filter');
    expect(grill?.description).toContain('visualize an existing ADR');
    expect(grill?.body).toContain('Generate HTML only on an explicit visualization request');
    expect(grill?.body).toContain('Deliver a clickable link');
    expect(grill?.body).toContain('user explicitly asks to open it');
    expect(grill?.body).toContain('do not invent one');
    expect(grill?.body).not.toContain('adrkit propose');
    expect(grill?.description).toContain('record every decision the session settles');
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

  it('names the required declaration and its two values in every shell', () => {
    // `--decided-by` is required to record a decision, so leaving it out of the
    // completion would leave the caller to guess a required argument. Fish
    // spells a long option `-l name`; the others carry the literal flag.
    expect(completionCommand('bash')).toContain('--decided-by');
    expect(completionCommand('bash')).toContain('--raised-by');
    expect(completionCommand('zsh')).toContain(
      "'--decided-by=[whose judgment settled the decision]:declared by:(human agent)'",
    );
    expect(completionCommand('zsh')).toContain(
      "'--raised-by=[who raised the decision]:declared by:(human agent)'",
    );
    expect(completionCommand('fish')).toContain('-l decided-by -x -a "human agent"');
    expect(completionCommand('fish')).toContain('-l raised-by -x -a "human agent"');
  });

  it('declares the value-taking options as taking a value', () => {
    // Registering `--tag`, `--tools`, `--workflows`, `--by`, or `--reason` as a
    // flag makes each shell offer the option list where the CLI expects a
    // value. zsh needs the `=` and an argument slot, fish needs `-x`.
    const zsh = completionCommand('zsh');
    expect(zsh).toContain("'--tools=[AI tools to install integrations for]:tools:'");
    expect(zsh).toContain("'--workflows=[workflows to install]:workflows:'");
    expect(zsh).toContain("'--by=[the decision that replaces this one]:by:'");
    expect(zsh).toContain("'--reason=[why the draft is discarded]:reason:'");
    expect(zsh).toContain("'--tag=[filter to one theme]:tag:'");
    const fish = completionCommand('fish');
    for (const option of ['tools', 'workflows', 'by', 'reason', 'tag']) {
      expect(fish, option).toMatch(
        new RegExp(`__fish_seen_subcommand_from \\w+" -l ${option} -x`),
      );
    }
    // Booleans stay valueless in both shells: list now takes only --help.
    expect(fish).toMatch(/__fish_seen_subcommand_from list" -l help$/m);
    expect(zsh).toMatch(/list\) _arguments --help '1:argument:'/);
  });

  it('gives commands outside the option table a fallback branch in zsh', () => {
    // Without a default arm a command that has no entry completes nothing at
    // all (zsh falls back to files); the fallback keeps the surface uniform.
    expect(completionCommand('zsh')).toContain("*) _arguments '--help' '1:argument:' ;;");
  });

  it.skipIf(process.platform === 'win32')(
    'completes the declaration values through a real bash',
    () => {
      // Piping the script through stdin keeps bash away from re-parsing the
      // completion script (and its quoting) a second time.
      const answer = (words: string, cword: number): string =>
        execFileSync(
          'bash',
          ['-s'],
          {
            encoding: 'utf8',
            input: [
              completionCommand('bash'),
              `COMP_WORDS=${words}`,
              `COMP_CWORD=${cword}`,
              '_adrkit_completion',
              'printf "%s " "${COMPREPLY[@]}"',
            ].join('\n'),
          },
        ).trim();

      // The two branches that matter: offering the values after the flag, and
      // still offering the command names themselves.
      expect(answer(`(adrkit decide SQLite --decided-by '')`, 4)).toBe('human agent');
      expect(answer(`(adrkit accept draft --decided-by '')`, 4)).toBe('human agent');
      // The flag is offered only where it is accepted, and its values only
      // after it: no command list leaks into an argument position.
      expect(answer(`(adrkit decide --dec)`, 2)).toBe('--decided-by');
      expect(answer(`(adrkit decide '')`, 2)).toContain('--decided-by');
      expect(answer(`(adrkit list --dec)`, 2)).toBe('');
      expect(answer(`(adrkit propose SQLite --decided-by '')`, 4)).not.toContain('human');
      expect(answer(`(adrkit val)`, 1)).toBe('validate');
      // A value option consumes the next word, so the option list must not
      // come back where the CLI is waiting for a value.
      expect(answer(`(adrkit graph '')`, 2)).toContain('--tag');
      expect(answer(`(adrkit graph --tag '')`, 3)).toBe('');
      expect(answer(`(adrkit init --tools '')`, 3)).toBe('');
    },
  );

  it.skipIf(spawnSync('zsh', ['--version']).status !== 0)(
    'completes options and values in a real zsh completion context',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'adrkit-zsh-'));
      tempDirs.push(dir);
      writeFileSync(join(dir, '_adrkit'), completionCommand('zsh'));
      const cases = [
        ['adrkit val', 'adrkit validate'],
        ['adrkit decide SQLite --dec', 'adrkit decide SQLite --decided-by='],
        ['adrkit decide "Use SQLite" --decided-by h', 'adrkit decide "Use SQLite" --decided-by human'],
        ['adrkit accept draft --decided-by a', 'adrkit accept draft --decided-by agent'],
        ['adrkit decide --decided-by h', 'adrkit decide --decided-by human'],
        ['adrkit decide SQLite --decided-by=a', 'adrkit decide SQLite --decided-by=agent'],
        ['adrkit propose SQLite --dec', 'adrkit propose SQLite --dec'],
        // A value option declares an argument slot, so zsh offers no candidate
        // and leaves the buffer alone instead of repeating the option list.
        // (Valueless options are pinned by the string assertions above: this
        // harness only observes insertion for options that take an argument.)
        ['adrkit graph --tag ', 'adrkit graph --tag'],
        ['adrkit init --tools ', 'adrkit init --tools'],
      ];
      // zpty provides the real ZLE context required by _arguments. Ctrl-X
      // reports the buffer after Tab without executing the proposed command.
      const output = execFileSync('zsh', ['-f'], {
        encoding: 'utf8',
        timeout: 10000,
        env: { ...process.env, TERM: 'xterm', ADRKIT_COMPLETION_DIR: dir },
        input: [
          'zmodload zsh/zpty',
          'zpty shell zsh -f',
          `trap 'zpty -d shell 2>/dev/null' EXIT`,
          `zpty -w shell 'fpath=("$ADRKIT_COMPLETION_DIR" $fpath); autoload -Uz compinit; compinit -D; bindkey "^I" expand-or-complete; report() { print -r -- "RESULT:$BUFFER"; zle .kill-whole-line; }; zle -N report; bindkey "^X" report; print READY'`,
          `zpty -r shell output '*READY\r\n*'`,
          ...cases.flatMap(([input]) => [
            `zpty -w -n shell $'${input}\\t\\x18'`,
            `zpty -r shell output '*RESULT:*\r\n*'`,
            'print -r -- "$output"',
          ]),
          'zpty -d shell',
        ].join('\n'),
      });
      const buffers = [...output.matchAll(/RESULT:([^\r\n]*)/g)].map((match) => match[1]!.trimEnd());
      expect(buffers).toEqual(cases.map(([, expected]) => expected));
    },
    15000,
  );

  it.skipIf(spawnSync('fish', ['--version']).status !== 0)(
    'completes space-separated declaration values through a real fish',
    () => {
      const answer = (command: string): string[] => execFileSync('fish', ['--no-config'], {
        encoding: 'utf8',
        input: `${completionCommand('fish')}\ncomplete -C '${command}'\n`,
      }).trim().split('\n').map((line) => line.split('\t')[0]!);
      expect(answer('adrkit decide SQLite --decided-by ')).toEqual(['agent', 'human']);
      expect(answer('adrkit accept draft --decided-by h')).toEqual(['human']);
      expect(answer('adrkit decide SQLite --decided-by=a')).toContain('--decided-by=agent');
      expect(answer('adrkit propose SQLite --decided-by ')).not.toContain('human');
      // `-x` on a value option suppresses both the option list and file
      // candidates, since the CLI expects a value the shell cannot enumerate.
      expect(answer('adrkit graph --tag ')).not.toContain('--dot');
      expect(answer('adrkit init --tools ')).not.toContain('--workflows');
    },
  );

  it('rejects unsupported shells', () => {
    expect(() => completionCommand('powershell')).toThrow(/unsupported shell/);
  });
});
