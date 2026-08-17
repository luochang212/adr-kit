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
  'completion',
  'version',
  'help',
];

export function completionCommand(shell: string): string {
  const words = COMMANDS.join(' ');
  switch (shell) {
    case 'bash':
      return `_openadr_completion() {
  local cur
  cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${words}" -- "$cur") )
}
complete -F _openadr_completion openadr
`;
    case 'zsh':
      return `#compdef openadr
_arguments '1:command:(${words})'
`;
    case 'fish':
      return COMMANDS.map((command) => `complete -c openadr -f -a "${command}"`).join('\n') + '\n';
    default:
      throw new Error(`unsupported shell "${shell}". Supported: bash, zsh, fish`);
  }
}
