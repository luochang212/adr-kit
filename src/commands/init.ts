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
    '  adrkit decide "use sqlite for sessions" # record a decision (default path)',
    '  adrkit propose "your first decision"    # draft a proposal for review',
  ].join('\n');
}