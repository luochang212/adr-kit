import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { VERSION } from './version.js';
import type { DecidedBy, RaisedBy } from './core/adr.js';
import { isDecidedBy, isRaisedBy } from './core/adr.js';
import { parseArgsOptions, unsupportedOptions } from './core/cli-options.js';
import { archiveCommand } from './commands/archive.js';
import { atlasCommand } from './commands/atlas.js';
import { completionCommand } from './commands/completion.js';
import { configCommand } from './commands/config.js';
import { hookInstallCommand, hookRunCommand, hookUninstallCommand } from './commands/hook.js';
import { recordCommand } from './commands/record.js';
import { implementCommand } from './commands/implement.js';
import { initCommand } from './commands/init.js';
import { instructionsCommand } from './commands/instructions.js';
import { listCommand } from './commands/list.js';
import { noteCommand } from './commands/note.js';
import { proposeCommand } from './commands/propose.js';
import { rejectCommand } from './commands/reject.js';
import { relevantCommand } from './commands/relevant.js';
import { showCommand } from './commands/show.js';
import { statusCommand } from './commands/status.js';
import { supersedeCommand } from './commands/supersede.js';
import { updateCommand } from './commands/update.js';
import { validateCommand } from './commands/validate.js';

const HELP = `adrkit ${VERSION} - A lightweight ADR workflow for humans and agents (npm package: adr-kit)

Getting started:
  1. Run adrkit init in your project to create adr/ and install workflow skills.
     Skills default to .agents/; --tools claude adds .claude/ copies.
     For an initialized project, use adrkit update when integrations need refreshing.
  2. Read the installed adrkit-init skill and merge its
     "Reading architecture decisions" section into AGENTS.md, preserving
     existing project rules. The CLI leaves AGENTS.md for you to edit.
  3. On later sessions, run adrkit list and read relevant decisions in full
     at task start; setup does not need repeating.
     Record architectural choices whose rationale should guide future work.
  Guide: https://github.com/luochang212/adr-kit#tell-your-agent

Records live in adr/proposed/, adr/implemented/, adr/rejected/, or adr/archived/.
An unshipped proposal stays proposed until implementation. record and
implement require two declarations. --raised-by records who put the decision on
the table; --decided-by records whose judgment settled it: human when a person
determined the direction (they stated it, changed a proposal into what shipped,
or you are recording one they made earlier), agent when it came from the
agent's own judgment. Either axis may be human or agent, and the CLI neither
infers nor verifies either.

Usage:
  adrkit init [path] [--tools <list>] [--workflows <list>]
                                           Initialize an ADR Kit repository
  adrkit record <title> --raised-by <human|agent> --decided-by <human|agent>
                                           Record an already-shipped decision
  adrkit propose <title>                     Create an unshipped proposal
  adrkit note <text>                         Park a one-line decision note in adr/notes.md
  adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>
                                           Mark shipped proposal implemented; assign number
  adrkit reject <name> --reason <reason>     Reject a proposal; keep it as an anti-pattern
  adrkit archive <name> --reason <reason>    Retire an implemented record
  adrkit supersede <name> --by <name>        Replace and archive an implemented decision
  adrkit list                                List all lifecycle records
  adrkit relevant [<path>... | --base <git-ref> | --staged]
                                           Retrieve scoped records for planned files or Git changes
  adrkit show <name>                         Show a record
  adrkit status                              Show lifecycle counts and validity
  adrkit instructions                        Print the next workflow step
  adrkit validate [name] [--all]
                                           Validate one record or the whole repo
  adrkit update [--tools <list>] [--workflows <list>]
                                           Rewrite AI tool integrations
  adrkit config                              Print the current configuration
  adrkit hook <install|uninstall|run>
                                           Manage the pre-commit decision check
  adrkit atlas [--out <path>] [--map] [--lang <en|zh>] [--theme <folio|signal|random>] [--record <name>] [--format <mermaid|dot|text|html>] [--formal-only]
                                           Write the decision atlas; --map selects the decision map, --record selects one deliberation tree
  adrkit completion <bash|zsh|fish>          Print a shell completion script
  adrkit version                             Print the version
  adrkit help                                Print this help
  adrkit -h, --help                          Print this help
  adrkit -V, --version                       Print the version

adrkit atlas writes the decision atlas from the current records: a single
self-contained HTML page with the decision map, a browsable directory, and
every record's text. --format html keeps this full atlas; --out <path> writes
it to a file instead of stdout. Example: adrkit atlas --format html --out adr.html.
--map explicitly selects the standalone decision map (HTML by default).
With --map, --format chooses mermaid, dot, text, or html; --formal-only drops mined edges. Example: adrkit atlas --map --out map.html.
A non-HTML format without --map or --record is rejected, not routed to a map.
--map and --record are mutually exclusive. --record <name> selects that
record's deliberation tree, with HTML as its default; --format html|mermaid|text
sets its encoding. All three objects default to HTML. The full atlas chrome is
English by default; --lang zh renders it in Chinese.
Full atlases offer Folio (paper/editorial) and Signal (dark/instrumental).
--theme folio|signal selects one; omitted --theme or --theme random rolls once
at generation. The file keeps that theme: no system preference or page switch.
Agents should prefer random without a clear preference; no theme prompt is needed.
--theme applies only to the full atlas, not --map or --record.
Atlas accepts no positional arguments; use --record <name> for a record.
With --out, the receipt identifies the object, format, and destination; stdout
without --out contains only the artifact.

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

export function main(argv: string[]): void {
  try {
    const { values, positionals, tokens } = parseArgs({
      args: argv,
      allowPositionals: true,
      tokens: true,
      options: parseArgsOptions(),
    });

    if (values.version) {
      console.log(VERSION);
      return;
    }
    if (values.help) {
      console.log(HELP);
      return;
    }

    const command = positionals[0] ?? '';
    const rest = positionals.slice(1);

    // Only record and implement assign provenance. Anywhere else the flags are a
    // mistake, not something to ignore, and this has to run before the switch
    // so a non-recording command never reaches the required-declaration check.
    for (const flag of ['decided-by', 'raised-by'] as const) {
      if (values[flag] !== undefined && command !== 'record' && command !== 'implement') {
        throw new Error(
          `adrkit ${command.length > 0 ? command : '(no command)'} does not take --${flag}`,
        );
      }
    }

    // Every other option is command-specific too: reject one a command does not
    // list instead of silently ignoring it. `--out` on `tree` was the sharp
    // case, where the caller got stdout and no file.
    const supplied = tokens
      .filter((token) => token.kind === 'option' && token.name !== undefined)
      .map((token) => `--${String(token.name)}`);
    const unsupported = unsupportedOptions(command, supplied);
    if (unsupported.length > 0) {
      throw new Error(`adrkit ${command} does not take ${unsupported.join(', ')}`);
    }

    switch (command) {
      case '': {
        console.error(HELP);
        process.exitCode = 1;
        return;
      }
      case 'help': {
        console.log(HELP);
        return;
      }
      case 'version': {
        console.log(VERSION);
        return;
      }
      case 'init': {
        if (rest.length > 1) {
          throw new Error('init takes at most one path');
        }
        const target = rest[0] ?? process.cwd();
        console.log(initCommand(target, values.tools, values.workflows));
        return;
      }
      case 'propose': {
        console.log(proposeCommand(joinTitle(rest, 'propose'), process.cwd()));
        return;
      }
      case 'note': {
        console.log(noteCommand(joinTitle(rest, 'note'), process.cwd()));
        return;
      }
      case 'record': {
        console.log(
          recordCommand(
            joinTitle(rest, 'record'),
            process.cwd(),
            requireDecidedBy(values['decided-by']),
            requireRaisedBy(values['raised-by']),
          ),
        );
        return;
      }
      case 'implement': {
        console.log(
          implementCommand(
            oneName(rest, 'implement'),
            process.cwd(),
            requireDecidedBy(values['decided-by']),
            requireRaisedBy(values['raised-by']),
          ),
        );
        return;
      }
      case 'reject': {
        console.log(rejectCommand(oneName(rest, 'reject'), requireReason(values.reason, 'reject'), process.cwd()));
        return;
      }
      case 'archive': {
        console.log(archiveCommand(oneName(rest, 'archive'), requireReason(values.reason, 'archive'), process.cwd()));
        return;
      }
      case 'supersede': {
        const by = values.by;
        if (by === undefined) {
          throw new Error('supersede requires --by <name>');
        }
        console.log(supersedeCommand(oneName(rest, 'supersede'), by, process.cwd()));
        return;
      }
      case 'list': {
        noPositionals(rest, 'list');
        console.log(listCommand(process.cwd()));
        return;
      }
      case 'relevant': {
        const result = relevantCommand(rest, process.cwd(), { base: values.base, staged: values.staged });
        console.log(result.output);
        if (!result.complete) process.exitCode = 1;
        return;
      }
      case 'show': {
        console.log(showCommand(oneName(rest, 'show'), process.cwd()));
        return;
      }
      case 'status': {
        noPositionals(rest, 'status');
        const result = statusCommand(process.cwd());
        console.log(result.output);
        if (result.valid === false) process.exitCode = 1;
        return;
      }
      case 'instructions': {
        noPositionals(rest, 'instructions');
        console.log(instructionsCommand(process.cwd()));
        return;
      }
      case 'update': {
        noPositionals(rest, 'update');
        console.log(updateCommand(process.cwd(), values.tools, values.workflows));
        return;
      }
      case 'config': {
        noPositionals(rest, 'config');
        console.log(configCommand(process.cwd()));
        return;
      }
      case 'hook': {
        // No mode falls through to the mode list below; only extra words are an arity error.
        const mode = rest.length === 0 ? '' : oneName(rest, 'hook');
        if (mode === 'install') {
          console.log(hookInstallCommand(process.cwd(), process.argv[1]));
          return;
        }
        if (mode === 'uninstall') {
          console.log(hookUninstallCommand(process.cwd()));
          return;
        }
        if (mode === 'run') {
          const result = hookRunCommand(process.cwd());
          if (result.output.length > 0) console.log(result.output);
          if (!result.ok) process.exitCode = 1;
          return;
        }
        throw new Error('hook requires install, uninstall, or run');
      }
      case 'atlas': {
        if (rest.length > 0) {
          throw new Error('adrkit atlas does not take positional arguments; use --record <name> to select a deliberation tree');
        }
        console.log(
          atlasCommand(process.cwd(), {
            out: values.out,
            map: values.map,
            record: values.record,
            format: values.format,
            lang: values.lang,
            theme: values.theme,
            formalOnly: values['formal-only'],
          }),
        );
        return;
      }
      case 'completion': {
        // An empty shell reaches completionCommand, whose error names the supported ones.
        const shell = rest.length === 0 ? '' : oneName(rest, 'completion');
        console.log(completionCommand(shell));
        return;
      }
      case 'validate': {
        if (values.all && rest.length > 0) {
          throw new Error('validate takes either a record name or --all, not both');
        }
        const result = validateCommand(process.cwd(), values.all ? undefined : oneNameOrNone(rest));
        console.log(result.output);
        if (result.valid === false) process.exitCode = 1;
        return;
      }
      default: {
        throw new Error(`unknown command "${command}"\n\n${HELP}`);
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

/**
 * Title-shaped positional: the shell splits an unquoted multi-word title into
 * separate words, so they are joined back rather than silently dropping every
 * word after the first. An empty title is still an error.
 */
function joinTitle(rest: string[], command: string): string {
  const title = rest.join(' ').trim();
  if (title.length === 0) {
    throw new Error(`${command} requires a title`);
  }
  return title;
}

/**
 * Identifier-shaped positional: a record name is one token, so extra words are
 * a mistake to report, not words to join or drop.
 */
function oneName(rest: string[], command: string): string {
  if (rest.length === 0 || rest[0]!.trim().length === 0) {
    throw new Error(`${command} requires a title or name`);
  }
  if (rest.length > 1) {
    throw new Error(`${command} takes one name, got ${rest.length} arguments: ${rest.join(' ')}`);
  }
  return rest[0]!;
}

/** `validate` without `--all` may name one record or none (the whole repo). */
function oneNameOrNone(rest: string[]): string | undefined {
  if (rest.length === 0) return undefined;
  return oneName(rest, 'validate');
}

function noPositionals(rest: string[], command: string): void {
  if (rest.length > 0) {
    throw new Error(`adrkit ${command} takes no positional arguments`);
  }
}

function requireReason(value: string | undefined, command: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${command} requires --reason <reason>`);
  }
  return value;
}

/**
 * `decided-by` is a declaration of where the choice came from, so the CLI asks
 * for it instead of guessing: no environment, terminal, or agent marker can
 * tell it who chose. The prompt states the same boundary the docs do, because
 * whoever reads this message is about to record a decision.
 */
function requireDecidedBy(value: string | undefined): DecidedBy {
  if (isDecidedBy(value)) return value;
  const problem = value === undefined ? 'is required' : `must be "human" or "agent", got "${value}"`;
  throw new Error(
    `--decided-by ${problem}:\n` +
      '  human   a person determined the direction: they stated it, changed a proposal\n' +
      '          into what shipped, or you are recording one they made earlier\n' +
      '  agent   the choice came from the agent\'s own judgment, not a person\'s;\n' +
      '          a person merely letting it through does not make it human',
  );
}

/**
 * `raised-by` is the other provenance axis: who put the decision on the table,
 * which is not the same as whose judgment settled it. Declared, never inferred.
 */
function requireRaisedBy(value: string | undefined): RaisedBy {
  if (isRaisedBy(value)) return value;
  const problem = value === undefined ? 'is required' : `must be "human" or "agent", got "${value}"`;
  throw new Error(
    `--raised-by ${problem}:\n` +
      '  human   a person put the decision on the table\n' +
      '  agent   the agent raised it, even if a person later settled the direction',
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
