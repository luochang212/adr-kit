import { initRepository } from '../core/repository.js';
import { writeInstalledWithConfig } from '../core/config.js';
import {
  integrationSummary,
  parseTools,
  parseWorkflows,
  standingOrdersNote,
  writeToolIntegrations,
} from '../core/tool-integrations.js';
import { VERSION } from '../version.js';

export function initCommand(targetDir: string, toolsValue?: string, workflowsValue?: string): string {
  const tools = parseTools(toolsValue);
  const workflows = parseWorkflows(workflowsValue);
  // `undefined` keeps the config key absent: only an explicit subset is
  // recorded, and an absent key means every workflow.
  const { root, created } = initRepository(
    targetDir,
    tools,
    workflowsValue === undefined ? undefined : workflows,
  );
  const lines = created.map((path) => `  created ${path}`);
  const integrations = writeToolIntegrations(root, tools, workflows);
  writeInstalledWithConfig(root, VERSION);
  const note = standingOrdersNote(root, integrations);
  return [
    `ADR Kit initialized at ${root}`,
    ...lines,
    ...integrationSummary(root, integrations),
    ...(note === undefined ? [] : ['', note]),
    '',
    'Next:',
    '  adrkit propose "use sqlite for sessions" # plan an unshipped choice',
    '  adrkit record "a shipped choice" --raised-by human --decided-by human',
  ].join('\n');
}
