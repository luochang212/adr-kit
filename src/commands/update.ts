import { readConfig, requireRoot, writeToolsConfig } from '../core/config.js';
import {
  integrationSummary,
  parseTools,
  removeToolIntegrations,
  staleIntegrationKeys,
  writeToolIntegrations,
} from '../core/tool-integrations.js';

export function updateCommand(cwd: string, toolsValue?: string): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  // A missing `tools` key means "never chose" (the standard default applies);
  // an empty recorded sequence is an explicit opt-out that must survive a
  // bare update.
  const tools = parseTools(
    toolsValue ?? (config.tools === undefined ? undefined : config.tools.join(',')),
  );
  const removed = removeToolIntegrations(root, staleIntegrationKeys(tools));
  writeToolsConfig(root, tools);
  const integrations = writeToolIntegrations(root, tools);
  const lines = [`updated AI tool integrations at ${root}`];
  if (removed.length > 0) {
    lines.push(`  removed integrations for: ${removed.join(', ')}`);
  }
  lines.push(...integrationSummary(root, integrations));
  return lines.join('\n');
}
