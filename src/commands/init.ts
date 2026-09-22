import { initRepository } from '../core/repository.js';
import { writeInstalledWithConfig } from '../core/config.js';
import {
  integrationSummary,
  parseTools,
  parseWorkflows,
  writeToolIntegrations,
} from '../core/tool-integrations.js';
import { VERSION } from '../version.js';

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
  writeInstalledWithConfig(root, VERSION);
  return [
    `ADR Kit initialized at ${root}`,
    ...lines,
    ...integrationSummary(root, integrations),
    '',
    'Next:',
    '  adrkit decide "use sqlite for sessions" --raised-by human --decided-by human # record a decision',
    '  adrkit propose "your first decision"    # only when it still needs review',
  ].join('\n');
}
