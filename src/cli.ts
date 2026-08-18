import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { VERSION } from './version.js';
import { acceptCommand } from './commands/accept.js';
import { completionCommand } from './commands/completion.js';
import { configCommand } from './commands/config.js';
import { decideCommand } from './commands/decide.js';
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

const HELP = `adrkit ${VERSION} - Open Architecture Decision Records

Usage:
  adrkit init [path] [--tools <list>]        Initialize an ADR Kit repository
  adrkit propose <title>                     Create a proposed decision
  adrkit decide <title>                      Create an accepted decision draft
  adrkit accept <name>                       Accept a proposal (assigns the next number)
  adrkit reject <name> --reason <reason>     Reject a proposal
  adrkit supersede <name> --by <name>        Mark an accepted decision as superseded
  adrkit list [--json]                       List all decision records
  adrkit show <name>                         Show a decision record
  adrkit status [--json]                     Show lifecycle counts and validity
  adrkit instructions [--json]               Print the next workflow step
  adrkit validate [name] [--all] [--json]    Validate one record or the whole repo
  adrkit update [--tools <list>]             Rewrite AI tool integrations
  adrkit config [--json]                     Print the current configuration
  adrkit completion <bash|zsh|fish>          Print a shell completion script
  adrkit version                             Print the version
  adrkit -h, --help                          Print this help
  adrkit -V, --version                       Print the version

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

export function main(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      all: { type: 'boolean', default: false },
      by: { type: 'string' },
      json: { type: 'boolean', default: false },
      reason: { type: 'string' },
      tools: { type: 'string' },
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
        console.log(initCommand(target, values.tools));
        return;
      }
      case 'propose': {
        requireTitle(rest, 'propose');
        console.log(proposeCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'decide': {
        requireTitle(rest, 'decide');
        console.log(decideCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'accept': {
        requireTitle(rest, 'accept');
        console.log(acceptCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'reject': {
        requireTitle(rest, 'reject');
        const reason = values.reason;
        if (reason === undefined) {
          throw new Error('reject requires --reason <reason>');
        }
        console.log(rejectCommand(rest[0]!, reason, process.cwd()));
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
        console.log(updateCommand(process.cwd(), values.tools));
        return;
      }
      case 'config': {
        console.log(configCommand(process.cwd(), values.json));
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
