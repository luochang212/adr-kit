import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface ToolIntegration {
  tool: string;
  path: string;
}

export const SUPPORTED_TOOLS = ['claude', 'codex', 'cursor', 'github-copilot', 'agents'] as const;
export type ToolId = (typeof SUPPORTED_TOOLS)[number];

const TOOL_COMMAND_DIR: Record<ToolId, string> = {
  claude: '.claude/commands',
  codex: '.codex/commands',
  cursor: '.cursor/commands',
  'github-copilot': '.github/prompts',
  agents: '.agents/commands',
};

const WORKFLOWS = [
  {
    name: 'openadr-propose',
    description: 'Create a new OpenADR proposal',
    body: `Use the OpenADR CLI to create a proposal.

Steps:
1. Run \`openadr propose "<title>"\` with the title supplied by the user.
2. Open the created file under \`adr/proposed/\`.
3. Fill every required section with real content: Problem, Proposal, Alternatives considered, Acceptance criteria, Risks.
4. Run \`openadr validate\` until it reports OK.`,
  },
  {
    name: 'openadr-decide',
    description: 'Record an already-accepted OpenADR decision',
    body: `Use the OpenADR CLI to record an accepted decision directly.

Steps:
1. Run \`openadr decide "<title>"\`.
2. Open the created file under \`adr/decisions/\`.
3. Fill Problem, Decision, Alternatives considered, and Consequences.
4. Run \`openadr validate <NNNN>\` until it reports OK.`,
  },
  {
    name: 'openadr-validate',
    description: 'Validate OpenADR records',
    body: `Run \`openadr validate\` to check the OpenADR repository.

- With no name, the whole repository is validated.
- With a name, only that record is validated.
- Use \`--json\` when the calling agent needs structured output.

Treat any non-OK output as a blocker before accepting or committing.`,
  },
  {
    name: 'openadr-accept',
    description: 'Accept a completed OpenADR proposal',
    body: `Accept a proposal with the OpenADR CLI.

Steps:
1. Run \`openadr validate\` and confirm the proposal is OK.
2. Run \`openadr accept "<name>"\`.
3. Confirm the output names the new \`adr/decisions/NNNN-*.md\` file.`,
  },
];

export function parseTools(value: string | undefined): ToolId[] {
  if (value === undefined || value.trim() === '' || value.trim() === 'none') {
    return [];
  }
  const requested = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (requested.includes('all')) {
    return [...SUPPORTED_TOOLS];
  }

  const tools: ToolId[] = [];
  for (const entry of requested) {
    if ((SUPPORTED_TOOLS as readonly string[]).includes(entry)) {
      tools.push(entry as ToolId);
    } else {
      throw new Error(
        `unknown tool "${entry}". Supported tools: ${SUPPORTED_TOOLS.join(', ')}, all, none`,
      );
    }
  }
  return [...new Set(tools)];
}

export function writeToolIntegrations(root: string, tools: ToolId[]): ToolIntegration[] {
  const created: ToolIntegration[] = [];
  for (const tool of tools) {
    const dir = join(root, TOOL_COMMAND_DIR[tool]);
    mkdirSync(dir, { recursive: true });
    for (const workflow of WORKFLOWS) {
      const fileName = `${workflow.name}.md`;
      const path = join(dir, fileName);
      writeFileSync(
        path,
        `---
description: ${workflow.description}
---

${workflow.body}
`,
      );
      created.push({ tool, path });
    }
  }
  return created;
}

export function removeToolIntegrations(root: string, tools: ToolId[]): void {
  for (const tool of tools) {
    const dir = join(root, TOOL_COMMAND_DIR[tool]);
    for (const workflow of WORKFLOWS) {
      const path = join(dir, `${workflow.name}.md`);
      if (existsSync(path)) {
        rmSync(path);
      }
    }
  }
}

export function integrationSummary(root: string, created: ToolIntegration[]): string[] {
  return created.map((item) => `  created ${relative(root, item.path)} (${item.tool})`);
}
