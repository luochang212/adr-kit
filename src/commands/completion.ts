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
  decide: ['--decided-by', '--help'],
  accept: ['--decided-by', '--help'],
  reject: ['--reason', '--help'],
  supersede: ['--by', '--help'],
  list: ['--json', '--help'],
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

/** The only option whose values are a fixed two-element set. */
const DECIDED_BY_VALUES = ['human', 'agent'];

export function completionCommand(shell: string): string {
  const words = COMMANDS.join(' ');
  switch (shell) {
    case 'bash':
      return `_adrkit_completion() {
  local cur prev command option
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  command="\${COMP_WORDS[1]}"

  if [[ "$prev" == "--decided-by" ]]; then
    if [[ "$command" == "decide" || "$command" == "accept" ]]; then
      COMPREPLY=( $(compgen -W "${DECIDED_BY_VALUES.join(' ')}" -- "$cur") )
    else
      # The flag is not accepted here, so its values are not candidates.
      COMPREPLY=()
    fi
    return
  fi

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
  .map(([name, options]) => {
    const structured =
      name === 'decide' || name === 'accept'
        ? `'--decided-by=[who made the decision]:declared by:(${DECIDED_BY_VALUES.join(' ')})' ${options.filter((option) => option !== '--decided-by').join(' ')}`
        : options.join(' ');
    return `    ${name}) _arguments ${structured} '1:argument:' ;;`;
  })
  .join('\n')}
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
            options.filter((option) => option !== '--decided-by').map(
              (option) =>
                `complete -c adrkit -n "__fish_seen_subcommand_from ${command}" -l ${option.slice(2)}`,
            ),
          )
          .join('\n') +
        '\n' +
        DECIDED_BY_VALUES.map(
          (value) =>
            `complete -c adrkit -n "__fish_seen_subcommand_from decide accept" -l decided-by -x -a "${value}"`,
        ).join('\n') +
        '\n'
      );
    default:
      throw new Error(`unsupported shell "${shell}". Supported: bash, zsh, fish`);
  }
}
