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
2. For a new repository, run:

\`\`\`bash
adrkit init [path]
\`\`\`

   If \`adr/\` already exists, run \`adrkit update\` instead and continue with
   the project instruction setup below.

3. For a new repository, confirm the output lists \`adr/config.yaml\`, \`adr/decisions\`, and
   \`adr/.gitignore\`. Proposals are not a separate folder: they are ephemeral
   drafts in \`adr/.drafts/\`, created by \`adrkit propose\`. Durable records
   carry \`raised-by\` and \`decided-by\` fields you declare; drafts never do.

4. Add the following section to the project's agent instruction file
   (\`AGENTS.md\`; also \`CLAUDE.md\` if that is the team's entry point). Preserve
   existing instructions and update an equivalent section instead of adding
   a duplicate. This agent step supplies the task-start entry point; the CLI
   only installs workflow files. If ADR Kit is already initialized, use
   \`adrkit update\` to refresh those files and still check this section.

\`\`\`markdown
## Reading architecture decisions

At the start of a coding, design, or review task, if \`adr/\` exists, run
\`adrkit list\` and read every decision in full with \`adrkit show <N>\` (or read
its file). ADR sets are small; do not filter by title alone. Treat accepted
records as decision context, superseded records as history, and pending
drafts as unaccepted proposals. Check relevant decisions against current
code and the task's requirements. Apply the constraints that still hold;
explain conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.

A \`## Deliberation\` appendix records the design tree behind a decision. It is
reference material: read it only when that decision is in play, not on every
task.

Record an ADR when an architectural choice will constrain future development
and its rationale is not apparent from code alone. Record only decisions
actually made and genuine alternatives and trade-offs; do not invent reasons
to fill a template. Reuse an existing record for the same choice; record a
replacement when important assumptions change. Routine implementation details,
local fixes, and easily reversible choices need no ADR. If no important
architectural decision was made, create none. When you grill a decision with
the \`adrkit-grill\` workflow, record every decision the session settles: the
session is itself the importance signal, so the bar above governs only the
direct \`decide\`/\`propose\` path. \`accepted\` means a recorded
decision, not proof of human review. \`decided-by\` is a declaration of where the
choice came from, not an inference: \`human\` when a person determined the
direction — they stated it, changed a proposal into what shipped, or you are
recording one they made earlier — \`agent\` when it came from the agent's own
judgment, including when a person only let it through. The CLI neither infers
nor verifies it.
\`\`\`

## Rules

- Never create \`adr/\` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, read existing decisions and continue the task. Use
  \`adrkit decide "<title>" --raised-by human --decided-by human\` (\`agent\` on
  either axis when that is the truth) only for an important architectural choice
  already made, or \`adrkit propose "<title>"\` when such a choice still needs
  review.`,
  },
  {
    name: 'adrkit-grill',
    description:
      "Use when a decision is still being shaped and its direction is not settled, in a repository with an adr/ directory, or on any 'grill' trigger phrase; grill the user to shared understanding and record every decision the session settles.",
    body: `# ADR Kit Grill

## Overview

Interrogate the user about a decision until nothing is left silently
assumed, then record every decision the session settled. The session feeds the
record directly: the root questions become \`## Problem\`, the rejected options
become \`## Alternatives considered\`, and who raised and who overrode feeds
\`raised-by\` and \`decided-by\`.

The interrogation method is adapted from the \`grilling\` skill in
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

## When to grill

Grill when a decision is still being shaped and its direction is not settled:
an architectural choice, or any other decision worth stress-testing before it
is recorded. The direct \`decide\`/\`propose\` paths keep the ADR importance bar;
a grilling session is itself the signal that its output is key, so its
decisions are not filtered again at record time.

## Method

1. Run \`adrkit list\` and read every decision in full with \`adrkit show <N>\`
   (or read its file), even if you ran it earlier in this conversation. The
   tree must not re-ask what an existing record already settles; reopening a
   settled decision is a supersede, not a question.
2. Map the decision as a design tree: every decision branches into the
   decisions that hang off it.
3. Work the tree in rounds. The frontier is every question whose
   prerequisites are already settled: the questions you can ask now without
   guessing at answers you have not heard. Ask the whole frontier in one
   round, then wait for the user's answers before the next round. Format
   each question like:

\`\`\`
❓ **Q1 - <question title>**: <question body, with options if any>

➡️ <your recommended answer>
\`\`\`

4. Each round of answers reshapes the tree: settled decisions push the
   frontier outward and unblock the questions that depended on them. A
   question whose answer depends on another question still open in this
   round belongs to a later round.
5. Finding facts is your job, never the user's: when a question needs a fact
   from the repository or the environment, look it up yourself (or dispatch
   a sub-agent) instead of asking. Do not block on a running lookup; only
   the questions downstream of it wait. The decisions are the user's: put
   each to them and wait.
6. The session is done when the frontier is empty: every branch visited,
   nothing left silently assumed. Do not act and do not write records until
   the user confirms you have reached shared understanding.

## Recording the outcome

1. Record every decision the session settled; there is no record-time filter.
   One session often settles several decisions: usually one primary record
   with the rest as branches, but split them when they can be superseded
   independently. Run \`adrkit decide "<title>" --raised-by human
   --decided-by human\` (or \`agent\` on either axis, per the rule below);
   grilling ends in a decision, never a proposal. Then follow the decide
   workflow.
2. Fill the record from the session: \`## Problem\` from the root questions,
   \`## Decision\` from the user's answers, \`## Alternatives considered\` from
   the frontier options they rejected, \`## Consequences\` from the branches
   their answers unlocked. Keep the design tree in an optional
   \`## Deliberation\` appendix: prefix a question \`Q:\` and an option \`A:\`, tag
   each node \`[settled]\`, \`[rejected]\`, or \`[open]\`, mark the option you
   recommended \`(recommended)\`, and give a rejected option a \` — reason\`.
   \`adrkit tree <N>\` renders it (\`--mermaid\`, or \`--html\` for a file). Add 2-4
   kebab-case \`tags\` to the front matter.
3. Declare both provenance axes: \`--raised-by\` is who put the decision on the
   table; \`--decided-by\` is whose judgment settled it. \`decided-by\` is \`human\`
   when the user's answers determined the direction — especially where they
   overrode your recommendations — and \`agent\` when they adopted every
   recommendation without engaging. Put the nuance in the body: which
   recommendations they changed and which they let through.
4. Run \`adrkit validate <N>\` until it returns OK.

## Rules

- One round at a time: never stack a question whose answer depends on a
  question still open in the same round.
- Never ask the user for a fact you could look up yourself.
- Never write a record mid-session; records follow the user's confirmation
  of shared understanding, and then every decision the session settled is
  recorded.
- A settled decision the user reopens becomes a supersede once its
  replacement is recorded and validated: use \`adrkit supersede\`, and say in
  the new record's \`## Problem\` what assumption changed.`,
  },
  {
    name: 'adrkit-propose',
    description: 'Use when starting a new architecture decision that still needs review before it is accepted.',
    body: `# ADR Kit Propose

## Overview

Create an ephemeral proposal draft in \`adr/.drafts/\`. A draft is temporary:
\`adrkit accept\` promotes it into a decision, \`adrkit reject\` discards it
without leaving a record.

## When to record

Use this workflow for architectural choices that constrain future development
and whose rationale is not apparent from code alone. Routine implementation
details, local fixes, and easily reversible choices need no ADR. Do not create
an ADR for every task or invent alternatives and reasons to fill a template.

## Steps

1. Run \`adrkit list\` and read every decision in full with \`adrkit show <N>\`
   (or read its file), even if you ran it earlier in this conversation.
   Check whether this decision supersedes or overlaps an existing one against
   current code and requirements. Treat superseded records as history and
   pending drafts as unaccepted proposals. Reuse an existing decision when
   it already captures the same choice; explain changed assumptions when
   replacing one, and use \`adrkit supersede\` after its replacement is recorded
   and validated.
2. Run:

\`\`\`bash
adrkit propose "<title>"
\`\`\`

3. Edit the created draft. Fill every section with real content:
   \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`,
   \`## Acceptance criteria\`, \`## Risks\`.
4. Add 2-4 kebab-case \`tags\` to the front matter (for example \`frontend\`,
   \`execution-layer\`) so the decision graph can group by theme.
5. Promote the completed draft with
   \`adrkit accept "<title>" --raised-by human --decided-by human\` (\`agent\` on
   either axis when that is the truth); the CLI validates it before promoting.
   \`raised-by\` is who put the draft on the table, \`decided-by\` whose judgment
   settled it. A person who merely lets a proposal through without engaging
   with the choice leaves \`decided-by\` with you: that is \`agent\`, and the body
   is where you say they approved it.

## Rules

- Do not skip \`## Alternatives considered\`. A proposal without alternatives
  is invalid by design.
- Keep the front matter exactly \`status: proposed\`. Never write \`raised-by\` or
  \`decided-by\`: a draft has no decision to attribute, so the values belong to
  \`adrkit accept\`, which requires you to declare them. A value written here is
  rejected while the draft exists and dropped when it is promoted.`,
  },
  {
    name: 'adrkit-decide',
    description: 'Use when work establishes an important architectural choice that will constrain future development and whose rationale is not apparent from code alone; record it after the choice is made.',
    body: `# ADR Kit Decide

## Overview

Record an already-made decision directly in \`adr/decisions/\` with the next
\`N\` number.

## When to record

Use this workflow for architectural choices that constrain future development
and whose rationale is not apparent from code alone. Routine implementation
details, local fixes, and easily reversible choices need no ADR. Do not create
an ADR for every task or invent alternatives and reasons to fill a template.

## Steps

1. Run \`adrkit list\` and read every decision in full with \`adrkit show <N>\`
   (or read its file), even if you ran it earlier in this conversation.
   Check whether this decision supersedes or overlaps an existing one against
   current code and requirements. Treat superseded records as history and
   pending drafts as unaccepted proposals. Reuse an existing decision when
   it already captures the same choice; explain changed assumptions when
   replacing one, and use \`adrkit supersede\` after its replacement is recorded
   and validated.
2. Run:

\`\`\`bash
adrkit decide "<title>" --raised-by human --decided-by human   # or agent on either axis
\`\`\`

3. Edit the created file and fill \`## Problem\`, \`## Decision\`,
   \`## Alternatives considered\`, and \`## Consequences\`. Add 2-4 kebab-case
   \`tags\` to the front matter (for example \`frontend\`, \`execution-layer\`)
   so the decision graph can group by theme.
4. Run \`adrkit validate <N>\` until it returns OK.

## Rules

- \`raised-by\` and \`decided-by\` declare the decision's provenance:
  \`raised-by\` is who put it on the table, \`decided-by\` whose judgment settled
  it. For \`decided-by\`, \`human\` means a person determined the direction — they
  stated it, changed your proposal into what shipped, or made it earlier and
  you are only recording it now; \`agent\` means it came from your own judgment,
  including when a person let your choice through without engaging with it. The
  fields record the source of the choice, not who ran the command: recording a
  person's decision makes it \`human\`, not \`agent\`. The CLI neither infers nor
  verifies either, so put the nuance (who redirected or approved) in the body.
- Accepted decisions must not contain \`## Proposal\`, \`## Acceptance
  criteria\`, or \`## Risks\` sections.
- Never edit the \`raised-by\` or \`decided-by\` value afterwards. A wrong value
  is a false provenance claim no later check can detect. A record missing the
  fields is not a blank to fill on a hunch: write them only when you know where
  the choice came from — your own judgment, or the person who directed it — and
  ask the person when you do not.
- \`accepted\` means a recorded decision, not proof of human review.
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
adrkit validate [name] [--all]
\`\`\`

- With no \`name\`, the whole repository is validated.
- \`name\` resolves by title, file name, or decision number.

## Rules

- Treat any non-OK output as a blocker for \`adrkit accept\`.
- A \`front matter must include "raised-by"\` or \`"decided-by"\` issue on a
  record that lacks the field is not yours to repair on a hunch: the value
  comes from whoever knows where that choice came from — your own judgment, or
  the person who directed it — so ask when you do not.
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
adrkit accept "<name>" --raised-by human --decided-by human   # or agent on either axis
\`\`\`

3. Confirm the output names the new \`adr/decisions/N-*.md\` file.

## Rules

- Declare \`raised-by\` and \`decided-by\` when you promote: \`raised-by\` is who
  put the draft on the table, \`decided-by\` whose judgment settled it. For
  \`decided-by\`, \`human\` means a person determined the direction (they stated
  it, changed this draft into what shipped, or you are recording one they made
  earlier), \`agent\` means it came from your own judgment, including when a
  person only let the draft through. Promotion is the last moment either value
  can be set; the CLI records what you declare without inferring or checking
  it. If the person redirected or approved your proposal, say so in the body.
- Never accept an invalid draft; the command refuses.
- Re-run \`adrkit show "<name>"\` immediately before accepting, even if you
  reviewed it earlier in this conversation; the repo may have changed since.
- \`accepted\` means a recorded decision, not proof of human review.
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
- Never hand-edit a superseded record afterwards; it is history, including
  its \`raised-by\` and \`decided-by\` values, which the command preserves rather
  than replacing with whoever retired it. Superseding changes the record's
  status, not who raised or decided it.
- Mention what it supersedes in the new decision's \`## Problem\` section so
  the causal link survives in prose.`,
  },
];

/** Bare workflow names (without the `adrkit-` prefix), in canonical order. */
export const WORKFLOW_NAMES: string[] = WORKFLOWS.map((workflow) =>
  workflow.name.replace(/^adrkit-/, ''),
);

/**
 * Resolve a comma-separated workflow selection to bare names in canonical
 * order. Absent flag or `all` means every workflow; each entry may carry the
 * `adrkit-` prefix. Unknown names and an empty selection are errors: a
 * subset with nothing in it is never a meaningful integration state.
 */
export function parseWorkflows(value: string | undefined): string[] {
  if (value === undefined) return [...WORKFLOW_NAMES];
  const text = value.trim();
  if (text === 'all') return [...WORKFLOW_NAMES];
  const requested = text
    .split(',')
    .map((entry) => entry.trim().replace(/^adrkit-/, ''))
    .filter((entry) => entry.length > 0);
  if (requested.length === 0) {
    throw new Error('--workflows needs at least one workflow name (or "all")');
  }
  const known = new Set(WORKFLOW_NAMES);
  const unknown = requested.find((entry) => !known.has(entry));
  if (unknown !== undefined) {
    throw new Error(`unknown workflow "${unknown}". Supported: ${WORKFLOW_NAMES.join(', ')}`);
  }
  const selected = new Set(requested);
  return WORKFLOW_NAMES.filter((name) => selected.has(name));
}

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

export function writeToolIntegrations(
  root: string,
  tools: IntegrationTarget[],
  workflows: string[] = WORKFLOW_NAMES,
): ToolIntegration[] {
  const created: ToolIntegration[] = [];
  const selected = WORKFLOWS.filter((workflow) =>
    workflows.includes(workflow.name.replace(/^adrkit-/, '')),
  );
  for (const tool of tools) {
    const dirs = TARGET_DIRS[tool];
    mkdirSync(join(root, dirs.commands), { recursive: true });
    for (const workflow of selected) {
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
      for (const workflow of selected) {
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

/**
 * Remove, inside every kept target, the integration files of workflows that
 * are no longer selected. Target directories survive: the selected workflows
 * still live in them.
 */
export function removeWorkflowIntegrations(
  root: string,
  tools: IntegrationTarget[],
  workflows: string[],
): void {
  for (const tool of tools) {
    const dirs = TARGET_DIRS[tool];
    for (const workflow of WORKFLOWS) {
      if (workflows.includes(workflow.name.replace(/^adrkit-/, ''))) continue;
      const commandPath = join(root, dirs.commands, `${workflow.name}.md`);
      if (existsSync(commandPath)) rmSync(commandPath);
      if (dirs.skills !== undefined) {
        const skillDir = join(root, dirs.skills, workflow.name);
        const skillPath = join(skillDir, 'SKILL.md');
        if (existsSync(skillPath)) rmSync(skillPath);
        removeEmptyDir(skillDir);
      }
    }
  }
}

export function integrationSummary(root: string, created: ToolIntegration[]): string[] {
  return created.map((item) => `  created ${relative(root, item.path)} (${item.tool})`);
}
