/**
 * The command surface: which commands exist and which options each one takes.
 * `src/cli.ts` uses it to reject an option a command does not take, and
 * `src/commands/completion.ts` uses it to offer the same options, so the two
 * cannot drift apart. Update this table whenever the CLI surface changes.
 */

export const COMMANDS = [
  'init',
  'propose',
  'decide',
  'accept',
  'reject',
  'supersede',
  'list',
  'show',
  'status',
  'instructions',
  'validate',
  'update',
  'config',
  'graph',
  'tree',
  'completion',
  'version',
  'help',
] as const;

/**
 * Options each command accepts, spelled with their leading dashes. `--help` is
 * valid everywhere; the global `--version` never reaches a command because the
 * CLI handles it before dispatch.
 */
export const COMMAND_OPTIONS: Record<string, string[]> = {
  init: ['--tools', '--workflows', '--help'],
  propose: ['--help'],
  decide: ['--raised-by', '--decided-by', '--help'],
  accept: ['--raised-by', '--decided-by', '--help'],
  reject: ['--reason', '--help'],
  supersede: ['--by', '--help'],
  list: ['--help'],
  show: ['--help'],
  status: ['--help'],
  instructions: ['--help'],
  validate: ['--all', '--help'],
  update: ['--tools', '--workflows', '--help'],
  config: ['--help'],
  graph: ['--mermaid', '--dot', '--text', '--html', '--formal-only', '--tag', '--out', '--help'],
  tree: ['--mermaid', '--text', '--html', '--help'],
  completion: ['--help'],
  version: ['--help'],
  help: ['--help'],
};

/**
 * Options that consume the following word as their value. Declaring them as
 * valueless would make every shell treat them as flags, so completion would
 * repeat the option list where the CLI expects free text.
 */
export const VALUE_OPTIONS = ['--by', '--reason', '--tag', '--tools', '--workflows', '--out'] as const;

export function takesValue(option: string): boolean {
  return (VALUE_OPTIONS as readonly string[]).includes(option);
}

/** Options supplied for a `command` that its synopsis does not list. */
export function unsupportedOptions(command: string, supplied: readonly string[]): string[] {
  const allowed = COMMAND_OPTIONS[command];
  if (allowed === undefined) return [];
  const set = new Set(allowed);
  return supplied.filter((option) => !set.has(option));
}
