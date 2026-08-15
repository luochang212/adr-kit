import { parseArgs } from 'node:util';
import { VERSION } from './version.js';
import { acceptCommand } from './commands/accept.js';
import { decideCommand } from './commands/decide.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { proposeCommand } from './commands/propose.js';
import { rejectCommand } from './commands/reject.js';
import { showCommand } from './commands/show.js';
import { validateCommand } from './commands/validate.js';

const HELP = `openadr ${VERSION} — Open Architecture Decision Records

Usage:
  openadr init [path]                        Initialize an OpenADR repository
  openadr propose <title>                     Create a proposed decision
  openadr decide <title>                      Create an accepted decision draft
  openadr accept <name>                       Accept a proposal (assigns NNNN)
  openadr reject <name> --reason <reason>     Reject a proposal
  openadr list [--json]                       List all decision records
  openadr show <name>                         Show a decision record
  openadr validate [name] [--json]            Validate one record or the whole repo
  openadr version                             Print the version

Run from anywhere inside the project; commands discover the nearest adr/ directory.
`;

export function main(argv: string[]): void {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: 'boolean', default: false },
      reason: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const command = positionals[0] ?? (values.help ? 'help' : '');
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
        console.log(initCommand(target));
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
      case 'list': {
        console.log(listCommand(process.cwd(), values.json));
        return;
      }
      case 'show': {
        requireTitle(rest, 'show');
        console.log(showCommand(rest[0]!, process.cwd()));
        return;
      }
      case 'validate': {
        const result = validateCommand(process.cwd(), rest[0], values.json);
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
