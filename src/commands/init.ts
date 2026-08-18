import { initRepository } from '../core/repository.js';
import { integrationSummary, parseTools, writeToolIntegrations } from '../core/tool-integrations.js';

export function initCommand(targetDir: string, toolsValue?: string): string {
  const tools = parseTools(toolsValue);
  const { root, created } = initRepository(targetDir, tools);
  const lines = created.map((path) => `  created ${path}`);
  const integrations = writeToolIntegrations(root, tools);
  return [
    `ADR Kit initialized at ${root}`,
    ...lines,
    ...integrationSummary(root, integrations),
    '',
    'Next:',
    '  adrkit propose "your first decision"   # start a proposal',
    '  adrkit decide "use sqlite for sessions" # record an accepted decision',
  ].join('\n');
}