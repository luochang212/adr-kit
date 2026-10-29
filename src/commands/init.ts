import { initRepository } from '../core/repository.js';
import { writeInstalledWithConfig } from '../core/config.js';
import {
  integrationSummary,
  parseTools,
  parseWorkflows,
  standingOrdersDriftNote,
  standingOrdersNote,
  writeToolIntegrations,
} from '../core/tool-integrations.js';
import { VERSION } from '../version.js';

export function initCommand(targetDir: string, toolsValue?: string, workflowsValue?: string): string {
  const tools = parseTools(toolsValue);
  const workflows = parseWorkflows(workflowsValue);
  // `undefined` keeps the config key absent: only an explicit subset is
  // recorded, and an absent key means every workflow.
  const { root, created, repaired } = initRepository(
    targetDir,
    tools,
    workflowsValue === undefined ? undefined : workflows,
  );
  const lines = created.map((path) => `  created ${path}`);
  if (repaired === true) {
    lines.push('  existing records and edited files were left untouched');
  }
  const integrations = writeToolIntegrations(root, tools, workflows, { preserveExisting: repaired === true });
  // Preserved files have an unknown writer version. Leave the stamp absent
  // and prompt here; later commands cannot compare versions without a stamp.
  const keptExisting = repaired === true && integrations.some((entry) => entry.outcome === 'preserved');
  if (!keptExisting) writeInstalledWithConfig(root, VERSION);
  const note = standingOrdersNote(root, integrations) ?? standingOrdersDriftNote(root);
  return [
    repaired === true
      ? `Repaired the ADR Kit repository at ${root}`
      : `ADR Kit initialized at ${root}`,
    ...lines,
    ...integrationSummary(root, integrations),
    ...(keptExisting
      ? ['', 'note: existing integration files were kept; run "adrkit update" to refresh them']
      : []),
    ...(note === undefined ? [] : ['', note]),
    '',
    'Next:',
    '  adrkit propose "use sqlite for sessions" # plan an unshipped choice',
    '  adrkit record "a shipped choice" --raised-by human --decided-by human',
  ].join('\n');
}
