import { initRepository } from '../core/repository.js';

export function initCommand(targetDir: string): string {
  const { root, created } = initRepository(targetDir);
  const lines = created.map((path) => `  created ${path}`);
  return [
    `OpenADR initialized at ${root}`,
    ...lines,
    '',
    'Next:',
    '  openadr propose "your first decision"   # start a proposal',
    '  openadr decide "use sqlite for sessions" # record an accepted decision',
  ].join('\n');
}
