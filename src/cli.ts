import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { VERSION } from './version.js';
import type { DecidedBy } from './core/adr.js';
import { acceptCommand } from './commands/accept.js';
import { completionCommand } from './commands/completion.js';
import { configCommand } from './commands/config.js';
import { decideCommand } from './commands/decide.js';
import { graphCommand } from './commands/graph.js';
import { initCommand } from './commands/init.js';
import { instructionsCommand } from './commands/instructions.js';
import { listCommand } from './commands/list.js';
import { proposeCommand } from './commands/propose.js';
import { rejectCommand } from './commands/reject.js';
import { showCommand } from './commands/show.js';
import { statusCommand } from './commands/status.js';
import { supersedeCommand } from './commands/supersede.js';
import { updateCommand } from './commands/update.js';
import { validateCommand } from './commands/validate.js';

const HELP = `adrkit ${VERSION} - A lightweight ADR workflow for humans and agents

Decisions are durable records in adr/decisions/. Proposals are ephemeral drafts
in adr/.drafts/ that are promoted by accept or discarded by reject. decide and
accept require --decided-by, which records who made the choice: human when a
person determined the direction (they stated it, changed a proposal into what
shipped, or you are recording one they made earlier), agent when it came from
the agent's own judgment. It records where the choice came from, not who ran
the command, and the CLI neither infers nor verifies it.

Usage:
  adrkit init [path] [--tools <list>] [--workflows <list>]
                                           Initialize an ADR Kit repository
  adrkit decide <title> --decided-by <human|agent>
                                           Record a decision (default path)
  adrkit propose <title>                     Create an ephemeral proposal draft
  adrkit accept <name> --decided-by <human|agent>
                                           Promote a draft to a decision (assigns the next number)
  adrkit reject <name> [--reason <reason>]   Discard a draft (leaves no record)
  adrkit supersede <name> --by <name>        Mark an accepted decision as superseded
  adrkit list [--json]                       List decisions and pending drafts
  adrkit show <name>                         Show a decision or draft
  adrkit status [--json]                     Show lifecycle counts and validity
  adrkit instructions [--json]               Print the next workflow step
  adrkit validate [name] [--all] [--json]    Validate one record or the whole repo
  adrkit update [--tools <list>] [--workflows <list>]
                                           Rewrite AI tool integrations
  adrkit config [--json]                     Print the current configuration
  adrkit graph [--mermaid|--dot|--json|--text] [--formal-only] [--tag <tag>]
                                           Emit the decision relationship graph
  adrkit completion <bash|zsh|fish>          Print a shell completion script
  adrkit version                             Print the version
  adrkit -h, --help                          Print this help
  adrkit -V, --version                       Print the version

adrkit graph visualizes the decision history: solid edges are formal
superseded-by links, dashed edges are ADR-N references mined from record
bodies, and nodes group by their created date. --mermaid pastes into any
Markdown and renders natively on GitHub (nodes are tinted by their tags),
--dot feeds Graphviz (dot -Tpng), --text prints a terminal-friendly tree,
--json exposes the graph to other tools; --tag <tag> filters to one theme,
--formal-only drops the mined edges.

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

const JSON_COMMANDS = new Set(['list', 'status', 'instructions', 'validate', 'config', 'graph']);

export function main(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      all: { type: 'boolean', default: false },
      by: { type: 'string' },
      'decided-by': { type: 'string' },
      dot: { type: 'boolean', default: false },
      'formal-only': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      mermaid: { type: 'boolean', default: false },
      text: { type: 'boolean', default: false },
      tag: { type: 'string' },
      reason: { type: 'string' },
      tools: { type: 'string' },
      workflows: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
    },
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
    // Commands without JSON output reject --json instead of ignoring it.
    if (values.json && command.length > 0 && !JSON_COMMANDS.has(command)) {
      throw new Error(`adrkit ${command} does not support --json`);
    }
    // Only decide and accept record a decision. Anywhere else the flag is a
    // mistake, not something to ignore, and this has to run before the switch
    // so a non-recording command never reaches the required-declaration check.
    if (
      values['decided-by'] !== undefined &&
      command !== 'decide' &&
      command !== 'accept'
    ) {
      throw new Error(
        `adrkit ${command.length > 0 ? command : '(no command)'} does not take --decided-by`,
      );
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
      case 'decide': {
        requireTitle(rest, 'decide');
        console.log(decideCommand(rest[0]!, process.cwd(), requireDecidedBy(values['decided-by'])));
        return;
      }
      case 'accept': {
        requireTitle(rest, 'accept');
        console.log(acceptCommand(rest[0]!, process.cwd(), requireDecidedBy(values['decided-by'])));
        return;
      }
      case 'reject': {
        requireTitle(rest, 'reject');
        console.log(rejectCommand(rest[0]!, values.reason, process.cwd()));
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
        console.log(listCommand(process.cwd(), values.json));
        return;
      }
      case 'show': {
        requireTitle(rest, 'show');
        console.log(showCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'status': {
        const result = statusCommand(process.cwd(), values.json);
        console.log(result.output);
        if (result.valid === false) process.exitCode = 1;
        return;
      }
      case 'instructions': {
        console.log(instructionsCommand(process.cwd(), values.json));
        return;
      }
      case 'update': {
        console.log(updateCommand(process.cwd(), values.tools, values.workflows));
        return;
      }
      case 'config': {
        console.log(configCommand(process.cwd(), values.json));
        return;
      }
      case 'graph': {
        console.log(
          graphCommand(process.cwd(), {
            mermaid: values.mermaid,
            dot: values.dot,
            json: values.json,
            text: values.text,
            formalOnly: values['formal-only'],
            tag: values.tag,
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
        const result = validateCommand(process.cwd(), values.all ? undefined : rest[0], values.json);
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

/**
 * `decided-by` is a declaration of where the choice came from, so the CLI asks
 * for it instead of guessing: no environment, terminal, or agent marker can
 * tell it who chose. The prompt states the same boundary the docs do, because
 * whoever reads this message is about to record a decision.
 */
function requireDecidedBy(value: string | undefined): DecidedBy {
  if (value === 'human' || value === 'agent') return value;
  const problem = value === undefined ? 'is required' : `must be "human" or "agent", got "${value}"`;
  throw new Error(
    `--decided-by ${problem}:\n` +
      '  human   a person determined the direction: they stated it, changed a proposal\n' +
      '          into what shipped, or you are recording one they made earlier\n' +
      '  agent   the choice came from the agent\'s own judgment, not a person\'s;\n' +
      '          a person merely letting it through does not make it human',
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
