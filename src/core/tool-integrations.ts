import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
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
    name: "adrkit-init",
    description: "Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.",
    body: `# ADR Kit Init

Run \`adrkit init [path]\` for a new repository, or \`adrkit update\` if \`adr/\` exists. Confirm the four lifecycle folders: \`proposed/\`, \`implemented/\`, \`rejected/\`, and \`archived/\`. They are a context budget as well as a lifecycle: \`implemented/\` is current authority, \`proposed/\` is intent, \`rejected/\` is anti-pattern memory, and \`archived/\` is lowest-value frozen history. The CLI installs workflow skills but does not rewrite a project's standing orders.

Add or update this section in \`AGENTS.md\` (and \`CLAUDE.md\` when used):

## Reading architecture decisions

At the start of a coding, design, or review task, if \`adr/\` exists, run \`adrkit list\`. The four folders are a context budget: read the relevant \`implemented/\` records in full with \`adrkit show <N>\` or their files; check the relevant \`proposed/\` records for intent and the relevant \`rejected/\` records for the bad cases they warn against; treat \`archived/\` as frozen history and read it only when a task explicitly cites it. Do not judge relevance by title alone: inspect tags, paths, relationships, and task scope. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a \`## Deliberation\` appendix only when its decision is in play.

Before creating a record, compare it with the active records covering the same choice or mechanism: extend a duplicate, fully replace through \`adrkit supersede --by\` in the same change, or link a partial overlap while the older record stays active. When shipping or reviewing, keep each active record's realization facts — paths, names, defaults — aligned with shipped code; a changed choice is a new record with an explicit relationship, not a rewrite of old rationale. Archived records are sealed in \`adr/archived/MANIFEST.json\`, never edited, and not read by default.

Record an ADR when an architectural choice constrains future work and its rationale is not evident from code. Record genuine alternatives and trade-offs, not invented template filler. A grilling session records every choice it settles, but unshipped outcomes remain proposals. Use \`adrkit propose\` for unshipped work, \`adrkit implement\` after it ships, and \`adrkit record\` for an already-shipped decision. \`raised-by\` declares who introduced the choice; \`decided-by\` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.`,
  },
  {
    name: "adrkit-grill",
    description: "Use when a decision is still being shaped or the user asks to grill a plan; question it to shared understanding and record every settled choice.",
    body: `# ADR Kit Grill

Interrogate the user until the design tree has no silently assumed branch. This method is adapted from mattpocock/skills (MIT). For viewing existing records, use \`adrkit-visualize\`; grilling does not generate HTML by default.

## Method

1. Run \`adrkit list\`. Read the relevant \`implemented/\` records in full, check the relevant \`proposed/\` records for intent and the \`rejected/\` records for the bad cases they warn against, and consult \`archived/\` only when a task cites history. Recheck the inventory even if this conversation read it earlier; do not reopen a settled choice without naming that change. As the tree takes shape, search the active records for anything covering the same choice or mechanism, so a settled direction lands in the right record rather than a duplicate.
2. Map root questions and their dependent questions. Work in rounds: ask every question on the currently answerable frontier, each with genuine options and your recommendation. A downstream question waits until its prerequisite is answered. Format questions as \`Q1 - <title>\` with a clear recommendation.
3. Research repository and environment facts yourself. Do not ask the user for facts you can inspect. Let answers reshape the tree; record which option or question unlocked each follow-up.
4. Stop questioning only when the frontier is empty. State the proposed shared understanding and wait for the user's confirmation before acting or writing records.

## Recording

Record every choice the session settles; the session is the importance signal. Usually one primary record holds the tree, but split choices that can be superseded independently. An unshipped outcome goes to \`adrkit propose\`, even when the direction is settled. Fill \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`, \`## Acceptance criteria\`, and \`## Risks\` from actual answers. Keep the tree in an optional \`## Deliberation\` appendix: prefix questions \`Q:\`, options \`A:\`, tag nodes \`[settled]\`, \`[rejected]\`, or \`[open]\`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use \`adrkit record\` with truthful \`--raised-by\` and \`--decided-by\` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with \`adrkit supersede --by\` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles or tags. Run \`adrkit validate <name>\` after filling the record. Report which outcomes are proposals, not implemented guidance; \`adrkit implement\` is reserved for work that actually ships.`,
  },
  {
    name: "adrkit-visualize",
    description: "Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.",
    body: `# ADR Kit Visualize

Visualize existing records only when asked. Run \`adrkit list\` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- For one record's design tree, use \`adrkit tree <name> --html\` and save stdout to a local HTML file. If no \`## Deliberation\` appendix exists, say so instead of fabricating one.
- For the numbered decision set, use \`adrkit graph --html --out "<path>.html"\`. The map includes implemented guidance and archived history, but archived records are not current authority. Use \`--tag\` or \`--formal-only\` only when requested or useful to the question.
- For lightweight previews, \`--text\` or \`--mermaid\` may be enough; do not generate HTML merely because the CLI supports it.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless \`graph --out\` is used; the agent owns the browser handoff.`,
  },
  {
    name: "adrkit-propose",
    description: "Use when starting an architectural choice that has not shipped, whether its direction is open or settled.",
    body: `# ADR Kit Propose

Before writing, run \`adrkit list\` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Judge overlap from record content, not titles or tags; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: write the new record, then resolve the old one in the same change with \`adrkit supersede --by\`; never leave duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Then run \`adrkit propose "<title>"\`; it creates a dated, unnumbered file in \`adr/proposed/\`. Fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run \`adrkit validate <name>\` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.`,
  },
  {
    name: "adrkit-record",
    description: "Use when recording an already-shipped architectural decision directly, without a pending proposal.",
    body: `# ADR Kit Record

First run \`adrkit list\` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles or tags — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with \`adrkit supersede --by\` in the same change; a partial replacement keeps the older record active with a prose link between them.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update those facts in the existing record rather than recording a new one; a changed choice always needs a new record and an explicit relationship. Run \`adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>\`. Fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use \`human\` for a person's judgment, \`agent\` for the agent's; passive human approval does not change an agent-origin choice. Run \`adrkit validate <N>\`.`,
  },
  {
    name: "adrkit-validate",
    description: "Use when checking ADR record format before implementation, rejection, archival, or commit.",
    body: `# ADR Kit Validate

Run \`adrkit validate [name]\` for one record or \`adrkit validate\` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.

Repository-wide validation also checks the archive seal: \`adr/archived/MANIFEST.json\` must cover exactly the archived records and match their bytes. When it reports drift — edited bytes, an unsealed file, a missing file, a malformed or missing manifest — restore the sealed bytes, the manifest entry, or the empty manifest; never re-seal changed archived content to make the check pass. Before pushing, \`adrkit validate --base <git-ref>\` additionally proves the archive only grew since that ref: entries sealed at the base must remain byte-identical, so a coordinated edit of an archived file and its hash still fails. A base that carries no readable manifest fails.`,
  },
  {
    name: "adrkit-implement",
    description: "Use when a proposal has shipped and should become a numbered, active decision.",
    body: `# ADR Kit Implement

Confirm the proposal's work is shipped, not merely accepted for review. Compare the record's claimed paths, names, defaults, and mechanisms with the current code and tests, and check the active records for overlap with this choice: a full replacement is promoted and then resolved with \`adrkit supersede --by\` in the same change, while a partial replacement keeps the older record active and links both. Run \`adrkit show <name>\` and \`adrkit validate <name>\`; resolve errors. Then run \`adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>\`. The command assigns the next stable ADR number, rewrites proposal sections into a shipped decision, moves the record from \`proposed/\` to \`implemented/\`, and preserves \`created\` and \`tags\`. Inspect the generated Decision and Consequences so they state shipped facts rather than proposal-era intent, then validate the numbered record. Do not infer the two provenance declarations from the command runner.`,
  },
  {
    name: "adrkit-review",
    description: "Use when checking whether changed code and changed decision records still agree; scoped to record coherence, not general code review.",
    body: `# ADR Kit Review

Review decision-record coherence for a change, not general code quality. Run \`adrkit list\` first, then:

- Compare each changed or newly shipped record with the changed code and tests: claimed paths, names, defaults, mechanisms, and verification evidence must match what actually shipped.
- Search active implemented records for realization facts the change invalidated — moved files, renamed options, altered defaults, changed behavior — and report each stale record for a factual update in the same change. A decision reversal is a new record with an explicit relationship, never a rewrite of old rationale.
- Look for unresolved supersession: a new record that fully replaces an active one without \`adrkit supersede --by\`, or a partial overlap that should be linked in prose while both stay active.

Report evidence-backed findings that name the record and the code evidence. Finding no issue is a valid result; do not demand a record for a mechanical edit. A disagreement with the decision itself is a design question to raise, not a license to rewrite a historical record. Archived records are sealed, lowest-value history that is not read by default: report changes to them rather than editing them.`,
  },
  {
    name: "adrkit-reject",
    description: "Use when a formal proposal is declined and its anti-pattern should be recorded.",
    body: `# ADR Kit Reject

Read the proposal and check its alternatives. Run \`adrkit reject <name> --reason "<the tempting mistake this blocks>"\`. It moves the dated file from \`proposed/\` to \`rejected/\`, stamps the lifecycle date, and preserves the record and reason. A rejected proposal gets no ADR number. \`rejected/\` is anti-pattern memory, not a graveyard: keep a rejection only while its reason still blocks a plausible, meaningful mistake, and delete the record once it no longer teaches — rejections are unnumbered and unsealed, so removing one cannot reuse a number or break the archive. Do not use rejection to erase a settled but merely unshipped choice; that remains proposed.`,
  },
  {
    name: "adrkit-archive",
    description: "Use when an implemented record no longer guides work and current behavior has another authoritative owner.",
    body: `# ADR Kit Archive

Confirm the record has shipped, its distinct rationale no longer guides future work, and current behavior has another authoritative owner. Do not archive by age or quota. Run \`adrkit archive <N> --reason "<owner and why retired>"\`. The numbered record moves from \`implemented/\` to \`archived/\` — the lowest-value folder: sealed, frozen history, not current authority, and not read by default. Its number and history remain, and the command appends a content seal for the final archived file to \`adr/archived/MANIFEST.json\`. Validate afterward. Never edit an archived file or its seal after archival; if validation reports drift, restore the sealed bytes. If a newer implemented decision fully replaces it, use \`adrkit supersede --by\` instead; partial replacement leaves the still-relevant record active.`,
  },
  {
    name: "adrkit-supersede",
    description: "Use when one implemented decision fully replaces another and the old record must become archived history.",
    body: `# ADR Kit Supersede

First record or implement the replacement and validate it. Confirm it fully replaces the old decision; partial overlap calls for prose links while the old record remains active. Run \`adrkit supersede <old> --by <new>\`. Both records must be implemented; the command stamps \`superseded-by\`, moves the old numbered file into \`archived/\` (lowest-value frozen history), preserves its provenance and number, and seals the archived file in \`adr/archived/MANIFEST.json\`. Run \`adrkit validate\` to check the chain and the new seal. Do not edit the archived choice or rationale afterward.`,
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

/** Heading of the standing-orders section the init workflow asks agents to paste. */
export const STANDING_ORDERS_HEADING = '## Reading architecture decisions';

/**
 * A distinctive sentence from the section body. The init workflow allows an
 * agent to "update an equivalent section", so a section with a reworked
 * heading still counts; this phrase is what makes that honest instead of a
 * heading-only match.
 */
export const STANDING_ORDERS_RULE = 'Record an ADR when an architectural choice';

/**
 * The agent instruction file (AGENTS.md, then CLAUDE.md) that carries the
 * standing-orders section, or undefined when neither does. Reading only —
 * the files belong to the user, and the CLI never rewrites them.
 */
export function standingOrdersFile(root: string): string | undefined {
  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    try {
      const text = readFileSync(join(root, file), 'utf8');
      if (text.includes(STANDING_ORDERS_HEADING) || text.includes(STANDING_ORDERS_RULE)) {
        return file;
      }
    } catch {
      // Absent or unreadable: the file carries no section, keep looking.
    }
  }
  return undefined;
}

/**
 * The note for init/update output when no instruction file carries the
 * standing orders. Integration files being installed is what makes the
 * paste step meaningful, so an empty selection (an explicit `--tools none`
 * opt-out) stays quiet. The pointer is derived from what was actually
 * installed: a `--workflows` subset without the init workflow cannot name a
 * file that does not exist.
 */
export function standingOrdersNote(
  root: string,
  integrations: ToolIntegration[],
): string | undefined {
  if (integrations.length === 0) return undefined;
  if (standingOrdersFile(root) !== undefined) return undefined;
  const initSkill = integrations.find((item) =>
    item.path.endsWith(join('adrkit-init', 'SKILL.md')),
  );
  const source = initSkill
    ? `step 4 of ${relative(root, initSkill.path)}`
    : 'step 4 of the adrkit-init workflow (see the adr-kit README)';
  return [
    'note: neither AGENTS.md nor CLAUDE.md carries the standing orders, so agents',
    '  will not read adr/ at task start. Paste the "Reading architecture decisions"',
    `  section from ${source} into AGENTS.md.`,
  ].join('\n');
}
