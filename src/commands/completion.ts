import { DECIDED_BY_VALUES } from '../core/adr.js';

const COMMANDS = [
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
  'completion',
  'version',
  'help',
];

/**
 * Options each command takes, used for completion. `--decided-by` is listed
 * because it is required on the two commands that record a decision and its
 * two values are the whole point of the flag: completing the command name and
 * stopping there leaves the caller to guess a required argument.
 */
const COMMAND_OPTIONS: Record<string, string[]> = {
  init: ['--tools', '--workflows', '--help'],
  propose: ['--help'],
  decide: ['--decided-by', '--help'],
  accept: ['--decided-by', '--help'],
  reject: ['--reason', '--help'],
  supersede: ['--by', '--help'],
  list: ['--json', '--help'],
  show: ['--help'],
  status: ['--json', '--help'],
  instructions: ['--json', '--help'],
  validate: ['--all', '--json', '--help'],
  update: ['--tools', '--workflows', '--help'],
  config: ['--json', '--help'],
  graph: ['--mermaid', '--dot', '--json', '--text', '--formal-only', '--tag', '--help'],
  completion: ['--help'],
  version: ['--help'],
  help: ['--help'],
};

/**
 * Options that consume the following word as their value. Declaring them as
 * valueless would make every shell treat them as flags, so completion would
 * repeat the option list in a position where the CLI expects free text.
 */
const VALUE_OPTIONS = ['--by', '--reason', '--tag', '--tools', '--workflows'];

/** Short descriptions for the shells that show one next to an option. */
const OPTION_DESCRIPTIONS: Record<string, string> = {
  '--by': 'the decision that replaces this one',
  '--decided-by': 'who made the decision',
  '--reason': 'why the draft is discarded',
  '--tag': 'filter to one theme',
  '--tools': 'AI tools to install integrations for',
  '--workflows': 'workflows to install',
};

function takesValue(option: string): boolean {
  return VALUE_OPTIONS.includes(option);
}

/**
 * A `_arguments` spec: a boolean stands alone, while a value option has to
 * carry its `=` and an argument slot, or zsh offers it as a flag and the
 * caller is left typing a value with the option list still on screen.
 */
function zshSpec(option: string): string {
  if (option === '--decided-by') {
    return `'--decided-by=[${OPTION_DESCRIPTIONS[option]}]:declared by:(${DECIDED_BY_VALUES.join(' ')})'`;
  }
  if (takesValue(option)) {
    return `'${option}=[${OPTION_DESCRIPTIONS[option]}]:${option.slice(2)}:'`;
  }
  return option;
}

export function completionCommand(shell: string): string {
  const words = COMMANDS.join(' ');
  switch (shell) {
    case 'bash':
      return `_adrkit_completion() {
  local cur prev command option
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  command="\${COMP_WORDS[1]}"

  case "$prev" in
    --decided-by)
      if [[ "$command" == "decide" || "$command" == "accept" ]]; then
        COMPREPLY=( $(compgen -W "${DECIDED_BY_VALUES.join(' ')}" -- "$cur") )
      else
        # The flag is not accepted here, so its values are not candidates.
        COMPREPLY=()
      fi
      return
      ;;
    ${VALUE_OPTIONS.join('|')})
      # Free text with no candidate list: offering the option list again here
      # would suggest flags where the CLI expects a value.
      COMPREPLY=()
      return
      ;;
  esac

  # Options once a command is being written; command names only for the first
  # word. The -z arm is what keeps --decided-by completable when the option
  # itself is still being typed (an empty word left by the trailing space).
  if [[ "$cur" == -* || ( -z "$cur" && "$COMP_CWORD" -gt 1 ) ]]; then
    case "$command" in
${Object.entries(COMMAND_OPTIONS)
  .map(([name, options]) => `      ${name}) option="${options.join(' ')}" ;;`)
  .join('\n')}
      *) option="--help" ;;
    esac
    COMPREPLY=( $(compgen -W "$option" -- "$cur") )
    return
  fi

  COMPREPLY=( $(compgen -W "${words}" -- "$cur") )
}
complete -F _adrkit_completion adrkit
`;
    case 'zsh':
      return `#compdef adrkit
# _arguments is only legal inside a completion function, so the whole script
# lives in one; zsh defines it lazily when the user first completes adrkit.
_adrkit() {
  if (( CURRENT == 2 )); then
    _arguments '1:command:(${words})'
    return
  fi
  # Parse the remaining words as arguments of the selected subcommand.
  local command=$words[2]
  words=( "\${words[@]:1}" )
  (( CURRENT-- ))
  case $command in
${Object.entries(COMMAND_OPTIONS)
  .map(
    ([name, options]) =>
      `    ${name}) _arguments ${options.map(zshSpec).join(' ')} '1:argument:' ;;`,
  )
  .join('\n')}
    # Commands outside this table take a free-text argument and --help only.
    *) _arguments '--help' '1:argument:' ;;
  esac
}
_adrkit "$@"
`;
    case 'fish':
      return (
        COMMANDS.map((command) => `complete -c adrkit -f -a "${command}"`).join('\n') +
        '\n' +
        Object.entries(COMMAND_OPTIONS)
          .flatMap(([command, options]) =>
            options
              .filter((option) => option !== '--decided-by')
              .map(
                (option) =>
                  `complete -c adrkit -n "__fish_seen_subcommand_from ${command}" -l ${option.slice(2)}${takesValue(option) ? ' -x' : ''}`,
              ),
          )
          .join('\n') +
        '\n' +
        // `-x` requires the value and suppresses file candidates; both
        // declarations live on one line with the two values as `-a`.
        `complete -c adrkit -n "__fish_seen_subcommand_from decide accept" -l decided-by -x -a "${DECIDED_BY_VALUES.join(' ')}"` +
        '\n'
      );
    default:
      throw new Error(`unsupported shell "${shell}". Supported: bash, zsh, fish`);
  }
}
