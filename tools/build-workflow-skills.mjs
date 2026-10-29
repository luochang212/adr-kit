// Markdown skills are committed for GitHub distribution; author WORKFLOWS instead.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { WORKFLOWS, renderWorkflowSkill } from '../dist/core/tool-integrations.js';

for (const workflow of WORKFLOWS) {
  const directory = new URL(`../skills/${workflow.name}/`, import.meta.url);
  const path = new URL('SKILL.md', directory);
  const content = renderWorkflowSkill(workflow);
  if (existsSync(path) && readFileSync(path, 'utf8') === content) continue;
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, content);
}
