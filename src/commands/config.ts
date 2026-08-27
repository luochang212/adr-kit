import { configPath, readConfig, requireRoot } from '../core/config.js';
import { WORKFLOW_NAMES } from '../core/tool-integrations.js';

export function configCommand(cwd: string, asJson = false): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  // A missing `workflows` key means the full set (the default); report the
  // effective selection so `config` never hides what `update` would install.
  const workflows = config.workflows ?? WORKFLOW_NAMES;
  if (asJson) {
    return JSON.stringify(
      {
        path: configPath(root),
        context: config.context ?? '',
        rules: config.rules ?? {},
        tools: config.tools ?? [],
        workflows,
      },
      null,
      2,
    );
  }
  const lines = [`config: ${configPath(root)}`, ''];
  if (config.context !== undefined && config.context.trim().length > 0) {
    lines.push('context:', config.context.trim(), '');
  }
  if (config.tools !== undefined && config.tools.length > 0) {
    lines.push(`tools: ${config.tools.join(', ')}`, '');
  }
  lines.push(`workflows: ${workflows.join(', ')}`, '');
  lines.push(`rules: ${JSON.stringify(config.rules ?? {})}`);
  return lines.join('\n');
}
