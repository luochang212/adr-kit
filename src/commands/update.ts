import { readConfig, requireRoot, writeToolsConfig } from '../core/config.js';
import {
  SUPPORTED_TOOLS,
  integrationSummary,
  parseTools,
  removeToolIntegrations,
  writeToolIntegrations,
} from '../core/tool-integrations.js';

export function updateCommand(cwd: string, toolsValue?: string): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  const tools = parseTools(toolsValue ?? (config.tools ?? []).join(','));
  const stale = SUPPORTED_TOOLS.filter((tool) => !tools.includes(tool));
  removeToolIntegrations(root, stale);
  writeToolsConfig(root, tools);
  const integrations = writeToolIntegrations(root, tools);
  const lines = [`updated AI tool integrations at ${root}`];
  if (stale.length > 0) {
    lines.push(`  removed integrations for: ${stale.join(', ')}`);
  }
  lines.push(...integrationSummary(root, integrations));
  return lines.join('\n');
}
