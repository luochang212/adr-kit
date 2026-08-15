import { relative } from 'node:path';
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

export function initCommandOutput(root: string, created: string[]): string {
  const rel = relative(process.cwd(), root) || '.';
  return [`OpenADR initialized in ${rel}`, ...created.map((path) => `  created ${path}`)].join('\n');
}
