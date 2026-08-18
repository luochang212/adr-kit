import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

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

/**
 * Agent skills directories per tool (github-copilot is absent: it supports
 * prompts only, not a skills tree). Skills are surfaced at session start,
 * unlike slash-command files which load only when invoked.
 */
const TOOL_SKILL_DIR: Partial<Record<ToolId, string>> = {
  claude: '.claude/skills',
  codex: '.codex/skills',
  cursor: '.cursor/skills',
  agents: '.agents/skills',
};

export interface Workflow {
  name: string;
  description: string;
  body: string;
}

// The bodies mirror skills/<name>/SKILL.md one-to-one; the sync is
// machine-checked in test/integrations.test.ts.
export const WORKFLOWS: Workflow[] = [
  {
    name: 'adrkit-init',
    description: 'Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.',
    body: `# ADR Kit Init

## Overview

Create an \`adr/\` repository in the target directory.

## Steps

1. Decide the target directory (default: current working directory).
2. Run:

\`\`\`bash
adrkit init [path]
\`\`\`

3. Confirm the output lists \`adr/config.yaml\`, \`adr/decisions\`,
   \`adr/proposed\`, and \`adr/rejected\`.

## Rules

- Never create \`adr/\` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, the next action is usually \`adrkit propose "<title>"\`.`,
  },
  {
    name: 'adrkit-propose',
    description: 'Use when starting a new architecture decision that still needs review before it is accepted.',
    body: `# ADR Kit Propose

## Overview

Create a proposed ADR in \`adr/proposed/\`. The proposal is a draft and is
expected to fail \`adrkit validate\` until every required section is filled.

## Steps

1. Run:

\`\`\`bash
adrkit propose "<title>"
\`\`\`

2. Edit the created file. Fill every section with real content:
   \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`,
   \`## Acceptance criteria\`, \`## Risks\`.
3. Run \`adrkit validate\` until it returns OK.

## Rules

- Do not skip \`## Alternatives considered\`. A proposal without alternatives
  is invalid by design.
- Keep the status line exactly \`Status: proposed\`.
- Before proposing, run \`adrkit list\` and check whether this decision
  supersedes or overlaps an existing one; mention that in the record. Re-run
  it even if you ran it earlier in this conversation: session memory can be
  stale, and the repo may have changed.`,
  },
  {
    name: 'adrkit-decide',
    description: 'Use when recording a decision that is already accepted and does not need a proposal phase.',
    body: `# ADR Kit Decide

## Overview

Create an accepted decision draft directly in \`adr/decisions/\` with the
next \`N\` number.

## Steps

1. Run:

\`\`\`bash
adrkit decide "<title>"
\`\`\`

2. Edit the created file and fill \`## Problem\`, \`## Decision\`,
   \`## Alternatives considered\`, and \`## Consequences\`.
3. Run \`adrkit validate <N>\` until it returns OK.

## Rules

- Accepted decisions must not contain \`## Proposal\`, \`## Acceptance
  criteria\`, or \`## Risks\` sections.
- \`adrkit accept\` is the better path when a proposal already exists.`,
  },
  {
    name: 'adrkit-validate',
    description: 'Use when checking whether ADR files follow the ADR Kit format, especially before accepting a proposal or committing.',
    body: `# ADR Kit Validate

## Overview

Run the machine checks for one record or the whole repository.

## Steps

\`\`\`bash
adrkit validate [name] [--all] [--json]
\`\`\`

- With no \`name\`, the whole repository is validated.
- \`name\` resolves by title, file name, or decision number.

## Rules

- Treat any non-OK output as a blocker for \`adrkit accept\`.
- A fresh draft is expected to fail until the required sections are
  filled in; fix the exact issue printed rather than deleting sections.`,
  },
  {
    name: 'adrkit-accept',
    description: 'Use when a proposed ADR is complete and validated, and the team has decided to accept it.',
    body: `# ADR Kit Accept

## Overview

Accept a proposal. The CLI validates the proposal, assigns the next
\`N\` decision number, rewrites \`## Proposal\` to \`## Decision\`, folds
\`Acceptance criteria\` and \`Risks\` into \`## Consequences\`, and moves the
file from \`adr/proposed/\` to \`adr/decisions/\`.

## Steps

1. Run \`adrkit validate\` and confirm the proposal is OK.
2. Run:

\`\`\`bash
adrkit accept "<name>"
\`\`\`

3. Confirm the output names the new \`adr/decisions/N-*.md\` file.

## Rules

- Never accept an invalid proposal; the command refuses.
- Re-run \`adrkit validate\` immediately before accepting, even if you
  validated earlier in this conversation; the repo may have changed since.
- Review the generated \`## Consequences\` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example \`## Plan\`); save their content elsewhere
  if it still matters.`,
  },
  {
    name: 'adrkit-reject',
    description: 'Use when a proposed ADR should be declined and frozen for future reference.',
    body: `# ADR Kit Reject

## Overview

Reject a proposal. The CLI moves the file from \`adr/proposed/\` to
\`adr/rejected/\` and rewrites the status line with the reason.

## Steps

\`\`\`bash
adrkit reject "<name>" --reason "<why it was rejected>"
\`\`\`

## Rules

- Always provide a concrete reason; the command refuses an empty one.
- A rejected record is frozen history. Do not edit it afterwards.`,
  },
  {
    name: 'adrkit-supersede',
    description: 'Use when an accepted decision is replaced by a newer accepted decision and must be retired without deleting history.',
    body: `# ADR Kit Supersede

## Overview

Mark an accepted decision as superseded. The CLI rewrites only its status
line to \`Status: superseded by N\` and leaves the record in
\`adr/decisions/\` as frozen history.

## Steps

1. Record the replacement first (\`adrkit decide\` or \`adrkit propose\` +
   \`adrkit accept\`), and make sure it validates.
2. Run:

\`\`\`bash
adrkit supersede "<old name or number>" --by "<new name or number>"
\`\`\`

## Rules

- \`--by\` must reference an existing accepted decision that is not itself
  superseded; the command refuses dangling chains.
- Re-run \`adrkit list\` right before superseding to confirm the \`--by\` target
  still exists and is not itself superseded, even if you checked earlier in
  this conversation.
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

/** Installed skill content: canonical frontmatter plus the workflow body. */
function skillFrontmatter(workflow: Workflow): string {
  return `---
name: ${workflow.name}
description: ${workflow.description}
---

${workflow.body}
`;
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
    const skillBase = TOOL_SKILL_DIR[tool];
    if (skillBase !== undefined) {
      for (const workflow of WORKFLOWS) {
        const skillPath = join(root, skillBase, workflow.name, 'SKILL.md');
        mkdirSync(dirname(skillPath), { recursive: true });
        writeFileSync(skillPath, skillFrontmatter(workflow));
        created.push({ tool, path: skillPath });
      }
    }
  }
  return created;
}

function removeEmptyDir(dir: string): void {
  try {
    // rmdirSync only removes empty directories; rmSync throws EISDIR on
    // directories (even empty) in current Node, so it cannot be used here.
    if (readdirSync(dir).length === 0) {
      rmdirSync(dir);
    }
  } catch {
    // Directory does not exist or is not empty; nothing to clean.
  }
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
    const skillBase = TOOL_SKILL_DIR[tool];
    if (skillBase !== undefined) {
      const baseDir = join(root, skillBase);
      for (const workflow of WORKFLOWS) {
        const skillDir = join(baseDir, workflow.name);
        const skillPath = join(skillDir, 'SKILL.md');
        if (existsSync(skillPath)) {
          rmSync(skillPath);
        }
        removeEmptyDir(skillDir);
      }
      removeEmptyDir(baseDir);
    }
  }
}

export function integrationSummary(root: string, created: ToolIntegration[]): string[] {
  return created.map((item) => `  created ${relative(root, item.path)} (${item.tool})`);
}
