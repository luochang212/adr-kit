import {
  readConfig,
  requireRoot,
  writeToolsConfig,
  writeWorkflowsConfig,
} from '../core/config.js';
import {
  integrationSummary,
  parseTools,
  parseWorkflows,
  removeToolIntegrations,
  removeWorkflowIntegrations,
  staleIntegrationKeys,
  writeToolIntegrations,
} from '../core/tool-integrations.js';

export function updateCommand(cwd: string, toolsValue?: string, workflowsValue?: string): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  // A missing `tools` key means "never chose" (the standard default applies);
  // an empty recorded sequence is an explicit opt-out that must survive a
  // bare update. `workflows` follows the same rule with `all` as its default.
  const tools = parseTools(
    toolsValue ?? (config.tools === undefined ? undefined : config.tools.join(',')),
  );
  const workflowsArg =
    workflowsValue ?? (config.workflows === undefined ? undefined : config.workflows.join(','));
  const workflows = parseWorkflows(workflowsArg);
  const removed = removeToolIntegrations(root, staleIntegrationKeys(tools));
  removeWorkflowIntegrations(root, tools, workflows);
  writeToolsConfig(root, tools);
  if (workflowsArg !== undefined) writeWorkflowsConfig(root, workflows);
  const integrations = writeToolIntegrations(root, tools, workflows);
  const lines = [`updated AI tool integrations at ${root}`];
  if (removed.length > 0) {
    lines.push(`  removed integrations for: ${removed.join(', ')}`);
  }
  lines.push(...integrationSummary(root, integrations));
  return lines.join('\n');
}
