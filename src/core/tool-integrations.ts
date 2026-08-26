import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

export interface ToolIntegration {
  tool: string;
  path: string;
}

/**
 * Integration targets. The default is the vendor-neutral `.agents/`
 * convention: every mainstream agent (Codex, Cursor, GitHub Copilot / VS
 * Code, Junie, OpenCode, ...) discovers skills and commands there. Claude
 * Code is the one holdout - it scans only `.claude/` - so it stays an
 * explicit exception (`--tools claude`) until Anthropic ships AGENTS.md
 * support.
 */
export type IntegrationTarget = 'agents' | 'claude';

/** Directories one target owns; `skills` is absent for prompts-only shapes. */
interface TargetDirs {
  commands: string;
  skills?: string;
}

const TARGET_DIRS: Record<IntegrationTarget, TargetDirs> = {
  agents: { commands: '.agents/commands', skills: '.agents/skills' },
  claude: { commands: '.claude/commands', skills: '.claude/skills' },
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

3. Confirm the output lists \`adr/config.yaml\`, \`adr/decisions\`, and
   \`adr/.gitignore\`. Proposals are not a separate folder: they are ephemeral
   drafts in \`adr/.drafts/\`, created by \`adrkit propose\`.

## Rules

- Never create \`adr/\` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, the next action is usually \`adrkit decide "<title>"\`, or
  \`adrkit propose "<title>"\` when the decision still needs review.`,
  },
  {
    name: 'adrkit-propose',
    description: 'Use when starting a new architecture decision that still needs review before it is accepted.',
    body: `# ADR Kit Propose

## Overview

Create an ephemeral proposal draft in \`adr/.drafts/\`. A draft is temporary:
\`adrkit accept\` promotes it into a decision, \`adrkit reject\` discards it
without leaving a record.

## Steps

1. Run:

\`\`\`bash
adrkit propose "<title>"
\`\`\`

2. Edit the created draft. Fill every section with real content:
   \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`,
   \`## Acceptance criteria\`, \`## Risks\`.
3. Promote the completed draft with \`adrkit accept "<title>"\`; the CLI
   validates it before promoting.

## Rules

- Do not skip \`## Alternatives considered\`. A proposal without alternatives
  is invalid by design.
- Keep the front matter exactly \`status: proposed\`.
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

Record an already-made decision directly in \`adr/decisions/\` with the next
\`N\` number.

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
- \`adrkit validate\` checks durable decisions only; a draft in \`adr/.drafts/\`
  is validated by \`adrkit accept\` right before it is promoted.`,
  },
  {
    name: 'adrkit-accept',
    description: 'Use when a proposal draft is complete, and the team has decided to accept it.',
    body: `# ADR Kit Accept

## Overview

Promote a completed draft to a decision. The CLI validates the draft, assigns
the next \`N\` number, rewrites \`## Proposal\` to \`## Decision\`, folds
\`Acceptance criteria\` and \`Risks\` into \`## Consequences\`, writes
\`adr/decisions/N-*.md\`, and discards the draft from \`adr/.drafts/\`.

## Steps

1. Review the draft with \`adrkit show "<name>"\`; every section must have real
   content before accepting.
2. Run:

\`\`\`bash
adrkit accept "<name>"
\`\`\`

3. Confirm the output names the new \`adr/decisions/N-*.md\` file.

## Rules

- Never accept an invalid draft; the command refuses.
- Re-run \`adrkit show "<name>"\` immediately before accepting, even if you
  reviewed it earlier in this conversation; the repo may have changed since.
- Review the generated \`## Consequences\` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example \`## Plan\`); save their content elsewhere
  if it still matters.`,
  },
  {
    name: 'adrkit-reject',
    description: 'Use when a proposal draft should be declined and discarded.',
    body: `# ADR Kit Reject

## Overview

Discard a proposal draft. The CLI deletes the draft from \`adr/.drafts/\` and
leaves no record - rejection lives in the winning decision's
\`## Alternatives considered\`, not in a standalone rejected record.

## Steps

\`\`\`bash
adrkit reject "<name>" [--reason "<why it was rejected>"]
\`\`\`

## Rules

- \`--reason\` is optional and is only echoed; nothing is persisted. If the
  rejection matters, record it in \`## Alternatives considered\` of the decision
  that won.`,
  },
  {
    name: 'adrkit-supersede',
    description: 'Use when an accepted decision is replaced by a newer accepted decision and must be retired without deleting history.',
    body: `# ADR Kit Supersede

## Overview

Mark an accepted decision as superseded. The CLI rewrites its front matter
to \`status: superseded\` with \`superseded-by: N\`, stamps the supersede date
on the \`date\` field, and leaves the record in \`adr/decisions/\` as frozen
history.

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

export function parseTools(value: string | undefined): IntegrationTarget[] {
  // Flag absent: the standard integration is the default. An explicit empty
  // string (a config that recorded `tools: []`) keeps meaning "opt out".
  if (value === undefined) return ['agents'];
  const text = value.trim();
  if (text.length === 0 || text === 'none') return [];
  const requested = text
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const targets: IntegrationTarget[] = [];
  for (const entry of requested) {
    if (entry !== 'agents' && entry !== 'claude') {
      throw new Error(`unknown tool "${entry}". Supported: agents (default), claude, none`);
    }
    targets.push(entry);
  }
  // The standard target always ships; claude is an addition for mixed teams,
  // never a replacement for the files every other agent reads.
  return [...new Set<IntegrationTarget>(['agents', ...targets])];
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

export function writeToolIntegrations(root: string, tools: IntegrationTarget[]): ToolIntegration[] {
  const created: ToolIntegration[] = [];
  for (const tool of tools) {
    const dirs = TARGET_DIRS[tool];
    mkdirSync(join(root, dirs.commands), { recursive: true });
    for (const workflow of WORKFLOWS) {
      const fileName = `${workflow.name}.md`;
      const path = join(root, dirs.commands, fileName);
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
    if (dirs.skills !== undefined) {
      for (const workflow of WORKFLOWS) {
        const skillPath = join(root, dirs.skills, workflow.name, 'SKILL.md');
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

function targetHasIntegrations(root: string, dirs: TargetDirs): boolean {
  for (const workflow of WORKFLOWS) {
    if (existsSync(join(root, dirs.commands, `${workflow.name}.md`))) return true;
    if (dirs.skills !== undefined && existsSync(join(root, dirs.skills, workflow.name, 'SKILL.md'))) {
      return true;
    }
  }
  return false;
}

/** Targets whose integration files no longer belong to the selection. */
export function staleIntegrationKeys(selected: string[]): string[] {
  return Object.keys(TARGET_DIRS).filter((key) => !selected.includes(key));
}

/**
 * Remove our integration files for every stale key. Returns the keys that
 * actually had files so the caller only reports real removals.
 */
export function removeToolIntegrations(root: string, keys: string[]): string[] {
  const removed: string[] = [];
  for (const key of keys) {
    const dirs = TARGET_DIRS[key as IntegrationTarget];
    if (dirs === undefined) continue;
    const hadFiles = targetHasIntegrations(root, dirs);
    for (const workflow of WORKFLOWS) {
      const commandPath = join(root, dirs.commands, `${workflow.name}.md`);
      if (existsSync(commandPath)) rmSync(commandPath);
      if (dirs.skills !== undefined) {
        const skillDir = join(root, dirs.skills, workflow.name);
        const skillPath = join(skillDir, 'SKILL.md');
        if (existsSync(skillPath)) rmSync(skillPath);
        removeEmptyDir(skillDir);
      }
    }
    removeEmptyDir(join(root, dirs.commands));
    if (dirs.skills !== undefined) removeEmptyDir(join(root, dirs.skills));
    // The vendor root itself goes too, but only when empty: removeEmptyDir
    // never deletes a directory that still holds the user's own files.
    removeEmptyDir(dirname(join(root, dirs.commands)));
    if (dirs.skills !== undefined) removeEmptyDir(dirname(join(root, dirs.skills)));
    if (hadFiles) removed.push(key);
  }
  return removed;
}

export function integrationSummary(root: string, created: ToolIntegration[]): string[] {
  return created.map((item) => `  created ${relative(root, item.path)} (${item.tool})`);
}
