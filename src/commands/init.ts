import { initRepository } from '../core/repository.js';
import {
  integrationSummary,
  parseTools,
  parseWorkflows,
  writeToolIntegrations,
} from '../core/tool-integrations.js';

export function initCommand(targetDir: string, toolsValue?: string, workflowsValue?: string): string {
  const tools = parseTools(toolsValue);
  const workflows = parseWorkflows(workflowsValue);
  // `undefined` keeps the config key absent: only an explicit subset is
  // recorded, so repositories that install every workflow need no migration.
  const { root, created } = initRepository(
    targetDir,
    tools,
    workflowsValue === undefined ? undefined : workflows,
  );
  const lines = created.map((path) => `  created ${path}`);
  const integrations = writeToolIntegrations(root, tools, workflows);
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
