import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { VERSION } from './version.js';
import type { DecidedBy, RaisedBy } from './core/adr.js';
import { isDecidedBy, isRaisedBy } from './core/adr.js';
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
import { treeCommand } from './commands/tree.js';
import { updateCommand } from './commands/update.js';
import { validateCommand } from './commands/validate.js';

const HELP = `adrkit ${VERSION} - A lightweight ADR workflow for humans and agents

Decisions are durable records in adr/decisions/. Proposals are ephemeral drafts
in adr/.drafts/ that are promoted by accept or discarded by reject. decide and
accept require two declarations. --raised-by records who put the decision on
the table; --decided-by records whose judgment settled it: human when a person
determined the direction (they stated it, changed a proposal into what shipped,
or you are recording one they made earlier), agent when it came from the
agent's own judgment. Either axis may be human or agent, and the CLI neither
infers nor verifies either.

Usage:
  adrkit init [path] [--tools <list>] [--workflows <list>]
                                           Initialize an ADR Kit repository
  adrkit decide <title> --raised-by <human|agent> --decided-by <human|agent>
                                           Record a decision (default path)
  adrkit propose <title>                     Create an ephemeral proposal draft
  adrkit accept <name> --raised-by <human|agent> --decided-by <human|agent>
                                           Promote a draft to a decision (assigns the next number)
  adrkit reject <name> [--reason <reason>]   Discard a draft (leaves no record)
  adrkit supersede <name> --by <name>        Mark an accepted decision as superseded
  adrkit list                                List decisions and pending drafts
  adrkit show <name>                         Show a decision or draft
  adrkit status                              Show lifecycle counts and validity
  adrkit instructions                        Print the next workflow step
  adrkit validate [name] [--all]             Validate one record or the whole repo
  adrkit update [--tools <list>] [--workflows <list>]
                                           Rewrite AI tool integrations
  adrkit config                              Print the current configuration
  adrkit graph [--mermaid|--dot|--text|--html] [--formal-only] [--tag <tag>]
                                           Emit the decision relationship graph
  adrkit tree <name> [--mermaid|--text|--html] Render the record's deliberation tree
  adrkit completion <bash|zsh|fish>          Print a shell completion script
  adrkit version                             Print the version
  adrkit -h, --help                          Print this help
  adrkit -V, --version                       Print the version

adrkit graph visualizes the decision history: solid edges are formal
superseded-by links, dashed edges are ADR-N references mined from record
bodies, and nodes group by their created date. --mermaid pastes into any
Markdown and renders natively on GitHub (nodes are tinted by their tags),
--dot feeds Graphviz (dot -Tpng), --text prints a terminal-friendly tree,
--html emits an offline self-contained decision map; --tag <tag> filters to
one theme, --formal-only drops the mined edges.

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

export function main(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      all: { type: 'boolean', default: false },
      by: { type: 'string' },
      'decided-by': { type: 'string' },
      'raised-by': { type: 'string' },
      dot: { type: 'boolean', default: false },
      'formal-only': { type: 'boolean', default: false },
      mermaid: { type: 'boolean', default: false },
      html: { type: 'boolean', default: false },
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
    // Only decide and accept record a decision. Anywhere else the flags are a
    // mistake, not something to ignore, and this has to run before the switch
    // so a non-recording command never reaches the required-declaration check.
    for (const flag of ['decided-by', 'raised-by'] as const) {
      if (values[flag] !== undefined && command !== 'decide' && command !== 'accept') {
        throw new Error(
          `adrkit ${command.length > 0 ? command : '(no command)'} does not take --${flag}`,
        );
      }
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
        console.log(
          decideCommand(
            rest[0]!,
            process.cwd(),
            requireDecidedBy(values['decided-by']),
            requireRaisedBy(values['raised-by']),
          ),
        );
        return;
      }
      case 'accept': {
        requireTitle(rest, 'accept');
        console.log(
          acceptCommand(
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
        console.log(listCommand(process.cwd()));
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
      case 'graph': {
        console.log(
          graphCommand(process.cwd(), {
            mermaid: values.mermaid,
            dot: values.dot,
            text: values.text,
            html: values.html,
            formalOnly: values['formal-only'],
            tag: values.tag,
          }),
        );
        return;
      }
      case 'tree': {
        requireTitle(rest, 'tree');
        const format = values.html ? 'html' : values.mermaid ? 'mermaid' : 'text';
        console.log(treeCommand(rest[0]!, process.cwd(), format));
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
