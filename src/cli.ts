import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { VERSION } from './version.js';
import type { DecidedBy, RaisedBy } from './core/adr.js';
import { isDecidedBy, isRaisedBy } from './core/adr.js';
import { parseArgsOptions, unsupportedOptions } from './core/cli-options.js';
import { archiveCommand } from './commands/archive.js';
import { completionCommand } from './commands/completion.js';
import { configCommand } from './commands/config.js';
import { hookInstallCommand, hookRunCommand, hookUninstallCommand } from './commands/hook.js';
import { recordCommand } from './commands/record.js';
import { implementCommand } from './commands/implement.js';
import { graphCommand } from './commands/graph.js';
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
import { treeCommand } from './commands/tree.js';
import { updateCommand } from './commands/update.js';
import { validateCommand } from './commands/validate.js';

const HELP = `adrkit ${VERSION} - A lightweight ADR workflow for humans and agents

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
  adrkit graph [--mermaid|--dot|--text|--html] [--formal-only] [--tag <tag>] [--out <path>]
                                           Emit the decision relationship graph
  adrkit tree <name> [--mermaid|--text|--html] Render the record's deliberation tree
  adrkit completion <bash|zsh|fish>          Print a shell completion script
  adrkit version                             Print the version
  adrkit help                                Print this help
  adrkit -h, --help                          Print this help
  adrkit -V, --version                       Print the version

adrkit graph visualizes the decision history: solid edges are formal
superseded-by links, dashed edges are ADR-N references mined from record
bodies, and nodes group by their created date. --mermaid pastes into any
Markdown and renders natively on GitHub (nodes are tinted by their tags),
--dot feeds Graphviz (dot -Tpng), --text prints a terminal-friendly tree,
--html emits an offline self-contained decision map; --tag <tag> filters to
one theme, --formal-only drops the mined edges. --out <path> writes the output
to a file instead of stdout: the map resolves its record links from that
location, so a map written outside the repository still opens its records.

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

export function main(argv: string[]): void {
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

  try {
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
        const target = rest[0] ?? process.cwd();
        console.log(initCommand(target, values.tools, values.workflows));
        return;
      }
      case 'propose': {
        requireTitle(rest, 'propose');
        console.log(proposeCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'note': {
        requireTitle(rest, 'note');
        console.log(noteCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'record': {
        requireTitle(rest, 'record');
        console.log(
          recordCommand(
            rest[0]!,
            process.cwd(),
            requireDecidedBy(values['decided-by']),
            requireRaisedBy(values['raised-by']),
          ),
        );
        return;
      }
      case 'implement': {
        requireTitle(rest, 'implement');
        console.log(
          implementCommand(
            rest[0]!,
            process.cwd(),
            requireDecidedBy(values['decided-by']),
            requireRaisedBy(values['raised-by']),
          ),
        );
        return;
      }
      case 'reject': {
        requireTitle(rest, 'reject');
        console.log(rejectCommand(rest[0]!, requireReason(values.reason, 'reject'), process.cwd()));
        return;
      }
      case 'archive': {
        requireTitle(rest, 'archive');
        console.log(archiveCommand(rest[0]!, requireReason(values.reason, 'archive'), process.cwd()));
        return;
      }
      case 'supersede': {
        requireTitle(rest, 'supersede');
        const by = values.by;
        if (by === undefined) {
          throw new Error('supersede requires --by <name>');
        }
        console.log(supersedeCommand(rest[0]!, by, process.cwd()));
        return;
      }
      case 'list': {
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
        requireTitle(rest, 'show');
        console.log(showCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'status': {
        const result = statusCommand(process.cwd());
        console.log(result.output);
        if (result.valid === false) process.exitCode = 1;
        return;
      }
      case 'instructions': {
        console.log(instructionsCommand(process.cwd()));
        return;
      }
      case 'update': {
        console.log(updateCommand(process.cwd(), values.tools, values.workflows));
        return;
      }
      case 'config': {
        console.log(configCommand(process.cwd()));
        return;
      }
      case 'hook': {
        const mode = rest[0];
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
      case 'graph': {
        console.log(
          graphCommand(process.cwd(), {
            mermaid: values.mermaid,
            dot: values.dot,
            text: values.text,
            html: values.html,
            formalOnly: values['formal-only'],
            tag: values.tag,
            out: values.out,
          }),
        );
        return;
      }
      case 'tree': {
        requireTitle(rest, 'tree');
        console.log(
          treeCommand(rest[0]!, process.cwd(), {
            mermaid: values.mermaid,
            text: values.text,
            html: values.html,
          }),
        );
        return;
      }
      case 'completion': {
        const shell = rest[0] ?? '';
        console.log(completionCommand(shell));
        return;
      }
      case 'validate': {
        const result = validateCommand(process.cwd(), values.all ? undefined : rest[0]);
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

function requireTitle(rest: string[], command: string): void {
  if (rest.length === 0 || rest[0]!.trim().length === 0) {
    throw new Error(`${command} requires a title or name`);
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
