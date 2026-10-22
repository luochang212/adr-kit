/**
 * The command surface: which commands exist and which options each one takes.
 * One spec table feeds every consumer — the parseArgs declaration in
 * `src/cli.ts`, the per-command rejection check, and the shell completion in
 * `src/commands/completion.ts` — so the CLI cannot accept an option its
 * completion does not offer, or offer one the parser rejects. Update this
 * table whenever the CLI surface changes.
 */

export const COMMANDS = [
  'init',
  'propose',
  'note',
  'record',
  'implement',
  'reject',
  'archive',
  'supersede',
  'list',
  'relevant',
  'show',
  'status',
  'instructions',
  'validate',
  'update',
  'config',
  'hook',
  'atlas',
  'completion',
  'version',
  'help',
] as const;

export type CommandName = (typeof COMMANDS)[number];

export interface OptionSpec {
  /** Option name without its leading dashes, e.g. `decided-by`. */
  name: string;
  type: 'boolean' | 'string';
  /** Short alias for parseArgs, e.g. `h` for `--help`. */
  short?: string;
  /** True when completion hands the next word to the option as its value; the provenance declarations opt out because the shell offers their fixed values itself. */
  takesValue?: boolean;
  /** Commands whose synopsis lists the option; `all` (only `--help`) lists it everywhere, `none` (`--version`) lists it nowhere because the CLI answers it before dispatch. Members are constrained to `COMMANDS` so a misspelt command cannot silently drop the option. */
  commands: readonly CommandName[] | 'all' | 'none';
}

/**
 * Every option the CLI declares, ordered so the derived per-command and
 * value-option lists keep their long-standing shape; `as const` keeps the
 * literal types parseArgs narrows on.
 */
export const OPTION_SPECS = [
  { name: 'all', type: 'boolean', commands: ['validate'] },
  { name: 'base', type: 'string', takesValue: true, commands: ['relevant'] },
  { name: 'staged', type: 'boolean', commands: ['relevant'] },
  { name: 'raised-by', type: 'string', commands: ['record', 'implement'] },
  { name: 'decided-by', type: 'string', commands: ['record', 'implement'] },
  { name: 'by', type: 'string', takesValue: true, commands: ['supersede'] },
  { name: 'reason', type: 'string', takesValue: true, commands: ['reject', 'archive'] },
  { name: 'record', type: 'string', takesValue: true, commands: ['atlas'] },
  { name: 'diagram', type: 'boolean', commands: ['atlas'] },
  { name: 'format', type: 'string', takesValue: true, commands: ['atlas'] },
  { name: 'formal-only', type: 'boolean', commands: ['atlas'] },
  { name: 'tag', type: 'string', takesValue: true, commands: ['atlas'] },
  { name: 'tools', type: 'string', takesValue: true, commands: ['init', 'update'] },
  { name: 'workflows', type: 'string', takesValue: true, commands: ['init', 'update'] },
  { name: 'out', type: 'string', takesValue: true, commands: ['atlas'] },
  { name: 'help', type: 'boolean', short: 'h', commands: 'all' },
  { name: 'version', type: 'boolean', short: 'V', commands: 'none' },
] as const satisfies readonly OptionSpec[];

type SpecByName = { [S in (typeof OPTION_SPECS)[number] as S['name']]: S };

/** The parseArgs declaration shape the spec table implies: booleans default to false, strings stay optional. */
export type ParseArgsOptionsShape = {
  [K in keyof SpecByName]: SpecByName[K]['type'] extends 'boolean'
    ? { type: 'boolean'; short?: string; default: false }
    : { type: 'string'; short?: string };
};

/**
 * The parseArgs option declaration `src/cli.ts` parses with, built from the
 * spec table.
 */
export function parseArgsOptions(): ParseArgsOptionsShape {
  const options: Record<string, { type: 'boolean' | 'string'; short?: string; default?: false }> = {};
  for (const spec of OPTION_SPECS as readonly OptionSpec[]) {
    const entry: { type: 'boolean' | 'string'; short?: string; default?: false } = { type: spec.type };
    if (spec.short !== undefined) entry.short = spec.short;
    if (spec.type === 'boolean') entry.default = false;
    options[spec.name] = entry;
  }
  return options as ParseArgsOptionsShape;
}

/**
 * Options each command accepts, spelled with their leading dashes, derived
 * from the spec table: `--help` is valid everywhere, and the global
 * `--version` never reaches a command because the CLI handles it before
 * dispatch.
 */
export const COMMAND_OPTIONS: Record<string, string[]> = Object.fromEntries(
  COMMANDS.map((command) => [
    command,
    OPTION_SPECS
      .filter((spec: OptionSpec) =>
        spec.commands === 'all' ||
        (spec.commands !== 'none' && spec.commands.includes(command)))
      .map((spec) => `--${spec.name}`),
  ]),
);

/**
 * Options that consume the following word as their value. Declaring them as
 * valueless would make every shell treat them as flags, so completion would
 * repeat the option list where the CLI expects free text.
 */
export const VALUE_OPTIONS: readonly string[] = OPTION_SPECS
  .filter((spec: OptionSpec) => spec.takesValue === true)
  .map((spec) => `--${spec.name}`);

export function takesValue(option: string): boolean {
  return VALUE_OPTIONS.includes(option);
}

/** Options supplied for a `command` that its synopsis does not list. */
export function unsupportedOptions(command: string, supplied: readonly string[]): string[] {
  const allowed = COMMAND_OPTIONS[command];
  if (allowed === undefined) return [];
  const set = new Set(allowed);
  return supplied.filter((option) => !set.has(option));
}
