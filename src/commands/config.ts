import { configPath, readConfig, requireRoot } from '../core/config.js';

export function configCommand(cwd: string, asJson = false): string {
  const root = requireRoot(cwd);
  const config = readConfig(root);
  if (asJson) {
    return JSON.stringify(
      {
        path: configPath(root),
        context: config.context ?? '',
        rules: config.rules ?? {},
        tools: config.tools ?? [],
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
  lines.push(`rules: ${JSON.stringify(config.rules ?? {})}`);
  return lines.join('\n');
}
