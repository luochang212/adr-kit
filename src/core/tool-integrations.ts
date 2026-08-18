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

// The bodies mirror skills/<name>/SKILL.md one-to-one; the sync is
// machine-checked in test/integrations.test.ts.
export const WORKFLOWS = [
  {
    name: 'openadr-init',
    description: 'Use when initializing OpenADR in a repository or when the agent cannot find an adr/ directory.',
    body: `# OpenADR Init

## Overview

Create an \`adr/\` repository in the target directory.

## Steps

1. Decide the target directory (default: current working directory).
2. Run:

\`\`\`bash
openadr init [path]
\`\`\`

3. Confirm the output lists \`adr/config.yaml\`, \`adr/decisions\`,
   \`adr/proposed\`, and \`adr/rejected\`.

## Rules

- Never create \`adr/\` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, the next action is usually \`openadr propose "<title>"\`.`,
  },
  {
    name: 'openadr-propose',
    description: 'Use when starting a new architecture decision that still needs review before it is accepted.',
    body: `# OpenADR Propose

## Overview

Create a proposed ADR in \`adr/proposed/\`. The proposal is a draft and is
expected to fail \`openadr validate\` until every required section is filled.

## Steps

1. Run:

\`\`\`bash
openadr propose "<title>"
\`\`\`

2. Edit the created file. Fill every section with real content:
   \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`,
   \`## Acceptance criteria\`, \`## Risks\`.
3. Run \`openadr validate\` until it returns OK.

## Rules

- Do not skip \`## Alternatives considered\`. A proposal without alternatives
  is invalid by design.
- Keep the status line exactly \`Status: proposed\`.`,
  },
  {
    name: 'openadr-decide',
    description: 'Use when recording a decision that is already accepted and does not need a proposal phase.',
    body: `# OpenADR Decide

## Overview

Create an accepted decision draft directly in \`adr/decisions/\` with the
next \`NNNN\` number.

## Steps

1. Run:

\`\`\`bash
openadr decide "<title>"
\`\`\`

2. Edit the created file and fill \`## Problem\`, \`## Decision\`,
   \`## Alternatives considered\`, and \`## Consequences\`.
3. Run \`openadr validate <NNNN>\` until it returns OK.

## Rules

- Accepted decisions must not contain \`## Proposal\`, \`## Acceptance
  criteria\`, or \`## Risks\` sections.
- \`openadr accept\` is the better path when a proposal already exists.`,
  },
  {
    name: 'openadr-validate',
    description: 'Use when checking whether ADR files follow the OpenADR format, especially before accepting a proposal or committing.',
    body: `# OpenADR Validate

## Overview

Run the machine checks for one record or the whole repository.

## Steps

\`\`\`bash
openadr validate [name] [--json]
\`\`\`

- With no \`name\`, the whole repository is validated.
- \`name\` resolves by title, file name, or decision number.

## Rules

- Treat any non-OK output as a blocker for \`openadr accept\`.
- A fresh draft is expected to fail until the required sections are
  filled in; fix the exact issue printed rather than deleting sections.`,
  },
  {
    name: 'openadr-accept',
    description: 'Use when a proposed ADR is complete and validated, and the team has decided to accept it.',
    body: `# OpenADR Accept

## Overview

Accept a proposal. The CLI validates the proposal, assigns the next
\`NNNN\` decision number, rewrites \`## Proposal\` to \`## Decision\`, folds
\`Acceptance criteria\` and \`Risks\` into \`## Consequences\`, and moves the
file from \`adr/proposed/\` to \`adr/decisions/\`.

## Steps

1. Run \`openadr validate\` and confirm the proposal is OK.
2. Run:

\`\`\`bash
openadr accept "<name>"
\`\`\`

3. Confirm the output names the new \`adr/decisions/NNNN-*.md\` file.

## Rules

- Never accept an invalid proposal; the command refuses.
- Review the generated \`## Consequences\` after accepting.`,
  },
  {
    name: 'openadr-reject',
    description: 'Use when a proposed ADR should be declined and frozen for future reference.',
    body: `# OpenADR Reject

## Overview

Reject a proposal. The CLI moves the file from \`adr/proposed/\` to
\`adr/rejected/\` and rewrites the status line with the reason.

## Steps

\`\`\`bash
openadr reject "<name>" --reason "<why it was rejected>"
\`\`\`

## Rules

- Always provide a concrete reason; the command refuses an empty one.
- A rejected record is frozen history. Do not edit it afterwards.`,
  },
  {
    name: 'openadr-supersede',
    description: 'Use when an accepted decision is replaced by a newer accepted decision and must be retired without deleting history.',
    body: `# OpenADR Supersede

## Overview

Mark an accepted decision as superseded. The CLI rewrites only its status
line to \`Status: superseded by NNNN\` and leaves the record in
\`adr/decisions/\` as frozen history.

## Steps

1. Record the replacement first (\`openadr decide\` or \`openadr propose\` +
   \`openadr accept\`), and make sure it validates.
2. Run:

\`\`\`bash
openadr supersede "<old name or number>" --by "<new name or number>"
\`\`\`

## Rules

- \`--by\` must reference an existing accepted decision that is not itself
  superseded; the command refuses dangling chains.
- Never hand-edit a superseded record afterwards; it is history.
- Mention what it supersedes in the new decision's \`## Problem\` section so
  the causal link survives in prose.`,
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
