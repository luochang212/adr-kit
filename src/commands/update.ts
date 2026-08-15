import { readConfig, requireRoot } from '../core/config.js';
import { integrationSummary, parseTools, writeToolIntegrations } from '../core/tool-integrations.js';

export function updateCommand(cwd: string, toolsValue?: string): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  const tools = parseTools(toolsValue ?? (config.tools ?? []).join(','));
  const integrations = writeToolIntegrations(root, tools);
  return [
    `updated AI tool integrations at ${root}`,
    ...integrationSummary(root, integrations),
  ].join('\n');
}
