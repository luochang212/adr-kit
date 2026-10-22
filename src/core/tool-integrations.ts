import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * What a write did to the file: `created` when it did not exist, `rewrote`
 * when it existed with different content, `unchanged` when the content was
 * already byte-identical.
 */
export type IntegrationOutcome = 'created' | 'rewrote' | 'unchanged';

export interface ToolIntegration {
  tool: string;
  path: string;
  outcome: IntegrationOutcome;
}

/**
 * Integration targets. The default is the vendor-neutral `.agents/`
 * convention: every mainstream agent (Codex, Cursor, GitHub Copilot / VS
 * Code, Junie, OpenCode, ...) discovers skills and commands there. Claude
 * Code is the one holdout: since v2.1.277 it reads AGENTS.md for project
 * instructions, but it still discovers skills and commands only under
 * `.claude/`, so it stays an explicit exception (`--tools claude`).
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
  /** Supporting files, relative to skills/<name>/ and the installed skill. */
  resources?: string[];
}

/**
 * The purpose sentence that opens the standing-orders section, binding adr/ to
 * the two failure modes it exists to block. The template and this repository's
 * dogfooded AGENTS.md must carry it verbatim; test/integrations.test.ts checks
 * both sides.
 */
export const STANDING_ORDERS_PURPOSE =
  '`adr/` exists because agents over-focus on the current task and forget settled decisions: reading it at task start counters the drift, and recording when a choice settles counters the forgetting.';

/** Heading of the standing-orders section the init workflow asks agents to paste. */
export const STANDING_ORDERS_HEADING = '## Reading architecture decisions';

/**
 * The canonical section body between the heading and the marker: what an agent
 * pastes into AGENTS.md and reconciles when the template changes.
 */
const STANDING_ORDERS_BODY = `${STANDING_ORDERS_PURPOSE} At the start of a coding, design, or review task, if \`adr/\` exists, run \`adrkit list\`. The four folders are a context budget: read the relevant \`implemented/\` records in full with \`adrkit show <N>\` or their files; check the relevant \`proposed/\` records for intent and the relevant \`rejected/\` records for the bad cases they warn against (a rejection is durable: it leaves only when another record owns its warning); treat \`archived/\` as frozen history and read it only when a task explicitly cites it. Do not judge relevance by title alone: inspect tags, paths, relationships, and task scope; when a task targets specific files, \`adrkit relevant <path>\` retrieves the records whose \`paths:\` scopes govern them. For actual Git changes, use \`adrkit relevant --base <review-base>\` or \`adrkit relevant --staged\`; supplement scope matches with inventory reading for unscoped decisions and resolve incomplete-search diagnostics. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a \`## Deliberation\` appendix only when its decision is in play.

Before creating a record, compare it with the active records covering the same choice or mechanism: extend a duplicate; when the active record's mechanism is itself unsound, weigh removing it rather than patching it; for an unshipped full replacement, link its intent and keep the old authority active, then use \`adrkit supersede --by\` in the same change that ships and records the replacement; link a partial overlap while the older record stays active. When shipping or reviewing, keep each active record's realization facts — paths, names, defaults — aligned with shipped code; a changed choice is a new record with an explicit relationship, not a rewrite of old rationale. Archived records are ordinary Git-tracked history, never edited silently, and not read by default.

Records cost time to write, read, and maintain, and stale records can mislead; record only when preserving the rationale is worth that cost. For example, routing all writes through one boundary to preserve validation and auditing can merit an ADR: a later direct write may look locally correct while bypassing those guarantees. Routine fixes and local renames usually need none when code and tests adequately explain them.

Record an ADR when an architectural choice constrains future work and its lasting rationale or genuine trade-offs are not adequately explained by code, tests, and existing documentation. A behavior change alone does not qualify. Record genuine alternatives and trade-offs, not invented template filler. A grilling session records every choice it settles, but unshipped outcomes remain proposals. Use \`adrkit propose\` for unshipped work, \`adrkit implement\` after it ships, and \`adrkit record\` for an already-shipped decision. \`raised-by\` declares who introduced the choice; \`decided-by\` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

Records outlive the format that wrote them. When \`adrkit validate\` reports unknown fields, missing sections, or parse errors on records an older release wrote, treat it as format drift rather than damage: upgrade the \`adr-kit\` package to the latest stable release, migrate the active records to the current format where the change is mechanical, and report any record that cannot be carried over instead of forcing a rewrite; then re-run \`adrkit validate --all\`. Archived records are ordinary Git-tracked history: validate checks them by the current rules; a later format change is a normal migration commit.

When the user wants to review or share the project's history, use the \`adrkit-visualize\` skill; generate a browsable atlas from \`adr/implemented/\` and \`adr/archived/\` only, publish archived bodies in full, and pin the page to the commit it was built from.`;

/**
 * Fingerprint of the canonical section body. The marker is derived, never
 * hand-assigned: editing the wording changes the fingerprint, so a section
 * pasted from an older template automatically reads as stale — there is no
 * revision number to forget to bump.
 */
export const STANDING_ORDERS_MARK = createHash('sha256')
  .update(STANDING_ORDERS_BODY)
  .digest('hex')
  .slice(0, 8);

/** The marker line the pasted section and the template carry verbatim. */
export const STANDING_ORDERS_MARKER = `<!-- adrkit: standing-orders ${STANDING_ORDERS_MARK} -->`;

/**
 * The canonical standing-orders section — heading through marker — that the
 * init workflow asks agents to paste into AGENTS.md. The trailing marker
 * declares the section was reconciled with this template generation; it
 * survives translation because it is a comment, not prose.
 */
export function standingOrdersSection(): string {
  return `${STANDING_ORDERS_HEADING}\n\n${STANDING_ORDERS_BODY}\n\n${STANDING_ORDERS_MARKER}`;
}

// The bodies mirror skills/<name>/SKILL.md one-to-one; the sync is
// machine-checked in test/integrations.test.ts.
export const WORKFLOWS: Workflow[] = [
  {
    name: "adrkit-init",
    description: "Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.",
    body: `# ADR Kit Init

Installing ADR Kit wires a repository's decision memory into the surfaces agents read, against two failure modes: mid-task drift from long-term decisions, and forgetting settled choices until they bite.

Run \`adrkit init [path]\` for a new repository, or \`adrkit update\` if \`adr/\` exists. Confirm the four lifecycle folders: \`proposed/\`, \`implemented/\`, \`rejected/\`, and \`archived/\`. They are a context budget as well as a lifecycle: \`implemented/\` is current authority, \`proposed/\` is intent, \`rejected/\` is anti-pattern memory, and \`archived/\` is lowest-value frozen history. The CLI installs workflow skills but does not rewrite a project's standing orders.

Record language follows the repository: match the language of existing records, or the user's language when the repository has no records yet, and keep that language for both titles and bodies rather than switching per conversation.

Add or update this section in \`AGENTS.md\`:

${standingOrdersSection()}

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.`,
  },
  {
    name: "adrkit-grill",
    description: "Use when a decision is still being shaped, or the user asks to grill a plan; interrogate the design against the active records until no branch is silently assumed, and record every settled choice.",
    body: `# ADR Kit Grill

Grilling is the co-design checkpoint an agent deep in a task will otherwise skip: it forces the conversation between the plan and the long-term decisions before anything settles.

Interrogate the user until the design tree has no silently assumed branch. This method is adapted from mattpocock/skills (MIT). For viewing existing records, use \`adrkit-visualize\`; grilling does not generate HTML by default.

## Method

1. Run \`adrkit list\`. Read the relevant \`implemented/\` records in full, check the relevant \`proposed/\` records for intent and the \`rejected/\` records for the bad cases they warn against, and consult \`archived/\` only when a task cites history. Recheck the inventory even if this conversation read it earlier; do not reopen a settled choice without naming that change. \`adr/notes.md\` is the settle-moment buffer; read its unshaped lines as candidate material for the tree. As the tree takes shape, search the active records for anything covering the same choice or mechanism, so a settled direction lands in the right record rather than a duplicate.
2. Map root questions and their dependent questions. Work in rounds: ask every question on the currently answerable frontier, each with genuine options and your recommendation. A downstream question waits until its prerequisite is answered. Format questions as \`Q1 - <title>\` with a clear recommendation. Word each question so "yes" accepts your recommended answer.
3. Research repository and environment facts yourself. Do not ask the user for facts you can inspect. For planned files, run \`adrkit relevant <path>...\`, then use \`adrkit show <name>\` to read matching records. Supplement matches with inventory reading for unscoped decisions; resolve incomplete-search diagnostics, and never treat zero matches as permission to skip existing decisions. Identify constraints that still hold, changed assumptions, and conflicts before settling a branch. Recheck when scope changes. Let answers reshape the tree; record which option or question unlocked each follow-up.
4. Stop questioning only when the frontier is empty. State the proposed shared understanding and wait for the user's confirmation before acting or writing records.

## Evidence

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

## Recording

Record every choice the session settles; the session is the importance signal. Usually one primary record holds the tree, but split choices that can be superseded independently. An unshipped outcome goes to \`adrkit propose\`, even when the direction is settled. Fill \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`, \`## Acceptance criteria\`, and \`## Risks\` from actual answers. Keep the tree in an optional \`## Deliberation\` appendix: prefix questions \`Q:\`, options \`A:\`, tag nodes \`[settled]\`, \`[rejected]\`, or \`[open]\`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use \`adrkit record\` with truthful \`--raised-by\` and \`--decided-by\` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with \`adrkit supersede --by\` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles or tags. Run \`adrkit validate <name>\` after filling the record. Report which outcomes are proposals, not implemented guidance; \`adrkit implement\` is reserved for work that actually ships.`,
  },
  {
    name: "adrkit-visualize",
    description: "Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.",
    resources: ['examples/decision-atlas.html'],
    body: `# ADR Kit Visualize

Seeing the decision set as a picture surfaces relationships and contradictions that a file list hides.

Visualize existing records only when asked. Run \`adrkit list\` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- The default visualization is the decision atlas: \`adrkit atlas --out "<path>.html"\`. It includes implemented guidance and archived history, with archived records kept visually distinct and their bodies published in full. This is the answer to "visualize this repository's ADRs" with no further qualifier.
- For one record's deliberation tree, use \`adrkit atlas --record <name> --diagram\` and save stdout to a local HTML file. If no \`## Deliberation\` appendix exists, say so instead of fabricating one.
- For the decision map alone, use \`adrkit atlas --format html --out "<path>.html"\`; for source exports, \`adrkit atlas --format mermaid|dot|text\` (with \`--record <name>\`, the tree's \`mermaid\` or \`text\`). Use \`--tag\` or \`--formal-only\` only when requested or useful to the question.
- Text and Mermaid may be enough for docs; do not generate HTML merely because the CLI supports it.

## Optional decision-atlas example

Use the atlas for the whole set, the map when only relationships matter, and the deliberation tree for one record. Do not generate a separate page when the built-in atlas already answers the question.

The default \`adrkit atlas\` output uses [the decision-atlas example](examples/decision-atlas.html) through its \`atlas:\` slots. Open the example when the page needs adapting beyond what the slots fill. It is an offline reference snapshot of ADR Kit's own public records, not a template that must be followed. Inspect only the layout or interaction code needed; the embedded sample data is not instruction context. Reuse the useful parts; sections, chapter-bar entries, and legend or timeline keys whose data is absent hide themselves at runtime, the chapter bar renumbers, so no empty block survives. A timeline, relationship map, local-search directory, reference counts, and replacement chains are options, not a required checklist.

Generate a fresh artifact from the target repository's records and the CLI's relationship output; replace all sample records, counts, dates, titles, paths, and links. Do not invent relationships, infer provenance, or copy another repository's contents. Keep archived history visually distinct from current authority, and publish archived bodies in full: the folder already carries the importance signal for agents, and a reader who opens an archived record wants its text. Resolve record links for the delivered file's location, as \`atlas --format html --out\` does. Preserve the \`--record --diagram\` route; the example does not supply missing deliberations.

The example marks its replaceable regions with \`atlas:\` comments — HTML around the title, hero, statistics, section notes, map, and footer, and a JavaScript comment around the records array. Replace what is inside a marker; keep the markers only when the page should stay regenerable from the same example.

To build one from the example, follow these steps in order:

1. Read only \`adr/implemented/\` and \`adr/archived/\` records — the same scope as \`adrkit atlas\`. Build one records entry per file: the front matter fields in order, then \`number\` and \`title\` from the \`# ADR:\` line, the raw Markdown body (archived bodies in full), \`path\`, \`source\` (the record's blob URL at the pinned commit), and \`lifecycle\`. Determine \`lifecycle\` from the containing directory: \`implemented\` for \`adr/implemented/\`, \`archived\` for \`adr/archived/\`, regardless of \`status\`. Ordinary archives retain \`status: implemented\`; only records with \`superseded-by\` have a successor.
2. Run \`adrkit atlas --format html\` and keep its \`<svg>\` inline together with its canvas script. Rewrite each node link to an in-page \`#adr-N\` anchor and give the group the same id; the reader dialog, timeline, and directory search read the records array and the map edge attributes, so keep the class names and data attributes intact.
3. Compute the section notes from the repository's own numbers: record count, the first-to-last created date span and the number of distinct days that carry records, the densest day, the most-referenced implemented record, and the archived count. Never carry another repository's numbers into prose. The hero names the project once: the h1 is the name the repository declares for humans — its README or site title, else the repository name as written, in its Chinese form when the repository declares one; never translate, abbreviate, or substitute a suffixed package name. With the name in the h1, the eyebrow states only the genre and the lead paragraph opens with the archive's substance.
4. In the footer, pin the commit the records were read from (\`git rev-parse --short HEAD\`) and link it to the remote tree URL, so the page is traceable to an exact state.
5. Keep the example's legend, reader dialog, pagination, and back-to-top behavior and structure unchanged — they are repository-agnostic; translate their visible copy into the user's language, and vary the data and the short prose blocks.

For an adapted long page, keep navigation compact and the directory search local. Vertical wheel and finger swipes should scroll the page; explicit drag or horizontal gestures pan the map, while pinch or Ctrl/⌘ + wheel zooms. Bound panning on both axes and center drawings that fit. Match the user's language and styling preferences. Keep one vertical rhythm: every section boundary should read as the same gap, so wrapper padding never stacks with section padding. Check the resulting page at desktop and mobile sizes, including record opening, navigation, search, canvas bounds, and page scrolling over the map; after sections hide, confirm the chapter bar renumbered contiguously and every entry still resolves; keep it usable offline.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless \`atlas --out\` is used; the agent owns the browser handoff.`,
  },
  {
    name: "adrkit-propose",
    description: "Use when you catch yourself settling a choice future work must live with — a dependency, format, boundary, or default — and adr/ does not already own it; the work is unshipped and the direction may be open or settled.",
    body: `# ADR Kit Propose

A proposal is drift insurance: the cheapest durable home for a choice future tasks must inherit, written before the context that raised it evaporates.

Before writing, run \`adrkit list\` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Read \`adr/notes.md\` too — its unshaped lines are the likeliest raw material for this record. Judge overlap from record content, not titles or tags; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: create a proposal linking the decision it will replace; keep the implemented decision active until the replacement ships. After shipping, use \`adrkit implement\` and resolve the old decision with \`adrkit supersede --by\` in the same delivery change. A proposal is intent, not duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Then run \`adrkit propose "<title>"\`; it creates a dated, unnumbered file in \`adr/proposed/\`. Fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run \`adrkit validate <name>\` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.`,
  },
  {
    name: "adrkit-note",
    description: "Use when you notice a choice future work must live with but cannot shape a record right now — park it as one line in the buffer and keep moving; the buffer is counted until shaped.",
    body: `# ADR Kit Note

The note buffer is the one-line legal action at the settle moment: capture first, shape later — the quality gate stays with propose, grill, and record.

Run \`adrkit note "<one line>"\`; it appends a timestamped line to \`adr/notes.md\`, creating the file on first use. The buffer is a plain file outside the lifecycle — no front matter, no template, no number — and \`adrkit validate\` ignores it: notes are debt, not authority, and never a fifth lifecycle folder. Shape one when the moment allows — \`adrkit propose\` and \`adrkit grill\` read the buffer as candidate material, and \`adrkit record\` takes an already-shipped choice straight from it — and delete a line that shaped nothing. \`adrkit list\` and \`adrkit instructions\` count the unshaped lines so the debt stays visible.


When a source is already available, retain a PR/discussion link, commit, or attributed statement in the same line; capture must stay cheap and a source is optional. Distinguish a settled choice from a candidate needing confirmation, for example \`Candidate: use SQLite; rationale unknown; source: PR #42\`. Do not create alternatives or infer who decided from a transcript author, Git identity, or approval. Before shaping a note, inspect its source and resolve unknowns; a note proves neither a choice nor delivery.`,
  },
  {
    name: "adrkit-record",
    description: "Use when a choice that will constrain future work has already shipped and adr/ does not own it yet; record it directly, with no pending proposal.",
    body: `# ADR Kit Record

Recording a shipped choice at the moment of shipping keeps later tasks from re-deriving — and contradicting — it.

First run \`adrkit list\` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles or tags — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with \`adrkit supersede --by\` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update those facts in the existing record rather than recording a new one; a changed choice always needs a new record and an explicit relationship. Run \`adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>\`. Fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use \`human\` for a person's judgment, \`agent\` for the agent's; passive human approval does not change an agent-origin choice. Run \`adrkit validate <N>\`.`,
  },
  {
    name: "adrkit-validate",
    description: "Use when checking ADR record format before implementation, rejection, archival, or commit.",
    body: `# ADR Kit Validate

Validation keeps the record set a dependable memory: a format contract only works when drift fails loudly.

Run \`adrkit validate [name]\` for one record or \`adrkit validate\` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.

Repository-wide validation checks archived records like any other record. If it reports a format or path error in an archived file, migrate it in a normal Git commit with a reason and re-run; do not leave validation red. Before pushing, \`git diff <base> -- adr/archived\` shows what changed; there is no separate seal or \`validate --base\`.`,
  },
  {
    name: "adrkit-implement",
    description: "Use when a proposal has shipped and should become a numbered, active decision.",
    body: `# ADR Kit Implement

Promotion is what makes \`implemented/\` trustworthy authority — shipped guidance rather than intent — so later tasks can rely on what they read in full.

Confirm the proposal's work is shipped, not merely accepted for review. Compare the record's claimed paths, names, defaults, and mechanisms with the current code and tests, and check the active records for overlap with this choice: a full replacement is promoted and then resolved with \`adrkit supersede --by\` in the same change, while a partial replacement keeps the older record active and links both. Run \`adrkit show <name>\` and \`adrkit validate <name>\`; resolve errors. Then run \`adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>\`. The command assigns the next stable ADR number, rewrites proposal sections into a shipped decision, moves the record from \`proposed/\` to \`implemented/\`, and preserves \`created\` and \`tags\`. It folds acceptance criteria into \`### Verification\` and risks into \`### Trade-offs\` under \`## Consequences\`; it warns because the CLI cannot rewrite prose. Rewrite those subsections as present-tense shipped facts, inspect the generated Decision and Consequences for proposal-era language, then validate the numbered record. Do not infer the two provenance declarations from the command runner.`,
  },
  {
    name: "adrkit-review",
    description: "Use when checking whether changed code and changed decision records still agree; scoped to record coherence, not general code review.",
    body: `# ADR Kit Review

Review closes the loop between decisions and code: it catches the moment a change quietly stops obeying the record set, before the drift becomes a bug.

Review decision-record coherence for a change, not general code quality. Run \`adrkit list\` first, then:

- Compare each changed or newly shipped record with the changed code and tests: claimed paths, names, defaults, mechanisms, and verification evidence must match what actually shipped.
- For actual changes, run \`adrkit relevant --base <review-base>\` with the intended exact comparison commit, or \`adrkit relevant --staged\` for index-only review; without Git, pass known changed paths explicitly. Git modes preserve deletions and rename origins. Use \`adrkit show <name>\` to read matching records in full, supplement scope matches with inventory reading for unscoped decisions, and recheck decisions newly relevant beyond the planned scope. Resolve incomplete-search diagnostics rather than treating partial or zero matches as no constraints.
- Search active implemented records for realization facts the change invalidated — moved files, renamed options, altered defaults, changed behavior — and report each stale record for a factual update in the same change. A decision reversal is a new record with an explicit relationship, never a rewrite of old rationale.
- Look for unresolved supersession: a new record that fully replaces an active one without \`adrkit supersede --by\`, or a partial overlap that should be linked in prose while both stay active.

Keep a finding's observation and interpretation separate. Cite inspected code (file:line or a symbol), a test you actually ran, or an attributed source. Reproduce before calling a finding confirmed, and leave the failing scenario as an assertion under \`test/\`; label what you did not run, and treat a failed reproduction as a narrowed claim, not proof of absence. Record unknowns instead of inventing historical rationale. A confirmed defect is not yet a fix: weigh trigger probability, blast radius, fix cost, and the cost of leaving it, and state plainly any true finding you chose not to fix. \`adrkit validate\` checks record validity, not code compliance; scope matching proves neither reading nor compliance.

Report evidence-backed findings that name the record and the code evidence. Finding no issue is a valid result; do not demand a record for a mechanical edit. A disagreement with the decision itself is a design question to raise, not a license to rewrite a historical record. Archived records are lowest-value history that is not read by default: report changes to them rather than editing them silently.`,
  },
  {
    name: "adrkit-reject",
    description: "Use when a formal proposal is declined and its anti-pattern should be recorded.",
    body: `# ADR Kit Reject

A rejection is memory of the road not taken; without it, a later task re-walks the same dead end.

Read the proposal and check its alternatives. Run \`adrkit reject <name> --reason "<the tempting mistake this blocks>"\`. It moves the dated file from \`proposed/\` to \`rejected/\`, stamps the lifecycle date, and preserves the record and reason. A rejected proposal gets no ADR number. \`rejected/\` is a durable terminal record of a declined proposal — not a graveyard and not a cache: keep it, and remove it only when another record owns the warning it blocks, never merely because it seems stale. Its reason names that warning. Rejections are unnumbered, so removing a redundant one cannot reuse a number. Do not use rejection to erase a settled but merely unshipped choice; that remains proposed.`,
  },
  {
    name: "adrkit-archive",
    description: "Use when an implemented record no longer guides work and current behavior has another authoritative owner.",
    body: `# ADR Kit Archive

Archiving keeps the active set small enough to actually be read: guidance that stopped earning its context budget retires to archived history.

Confirm the record has shipped, its distinct rationale no longer guides future work, and current behavior has another authoritative owner. Do not archive by age or quota. Run \`adrkit archive <N> --reason "<owner and why retired>"\`. The numbered record moves from \`implemented/\` to \`archived/\` — the lowest-value folder: frozen history, not current authority, and not read by default. Its number and history remain. Validate afterward. Git records later changes; a format or path issue is a normal migration commit rather than an unfixable frozen record. If a newer implemented decision fully replaces it, use \`adrkit supersede --by\` instead; partial replacement leaves the still-relevant record active.`,
  },
  {
    name: "adrkit-supersede",
    description: "Use when one implemented decision fully replaces another and the old record must become archived history.",
    body: `# ADR Kit Supersede

Supersession turns a changed decision into an explicit handover instead of a silent contradiction between old and new guidance.

First record or implement the replacement and validate it. Confirm it fully replaces the old decision; partial overlap calls for prose links while the old record remains active. Run \`adrkit supersede <old> --by <new>\`. Both records must be implemented; the command stamps \`superseded-by\`, moves the old numbered file into \`archived/\` (lowest-value frozen history), and preserves its provenance and number. Run \`adrkit validate\` to check the chain. Git records later changes; a format or path issue is a normal migration commit. Do not edit the archived choice or rationale silently.`,
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

/** Write one integration file and report what the write actually did. */
function writeIntegrationFile(path: string, content: string, tool: string): ToolIntegration {
  const previous = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
  writeFileSync(path, content);
  const outcome: IntegrationOutcome =
    previous === undefined ? 'created' : previous === content ? 'unchanged' : 'rewrote';
  return { tool, path, outcome };
}

/** Resource paths are maintained here, not supplied by the target repository. */
function workflowResource(workflow: Workflow, path: string): string {
  return readFileSync(new URL(`../../skills/${workflow.name}/${path}`, import.meta.url), 'utf8');
}

function commandBody(workflow: Workflow): string {
  let body = workflow.body;
  for (const resource of workflow.resources ?? []) {
    body = body.replaceAll(`](${resource})`, `](../skills/${workflow.name}/${resource})`);
  }
  return body;
}

export function writeToolIntegrations(
  root: string,
  tools: IntegrationTarget[],
  workflows: string[] = WORKFLOW_NAMES,
): ToolIntegration[] {
  const written: ToolIntegration[] = [];
  const selected = WORKFLOWS.filter((workflow) =>
    workflows.includes(workflow.name.replace(/^adrkit-/, '')),
  );
  for (const tool of tools) {
    const dirs = TARGET_DIRS[tool];
    mkdirSync(join(root, dirs.commands), { recursive: true });
    for (const workflow of selected) {
      const fileName = `${workflow.name}.md`;
      const path = join(root, dirs.commands, fileName);
      written.push(
        writeIntegrationFile(
          path,
          `---
description: ${workflow.description}
---

${commandBody(workflow)}
`,
          tool,
        ),
      );
    }
    if (dirs.skills !== undefined) {
      for (const workflow of selected) {
        const skillPath = join(root, dirs.skills, workflow.name, 'SKILL.md');
        mkdirSync(dirname(skillPath), { recursive: true });
        written.push(writeIntegrationFile(skillPath, skillFrontmatter(workflow), tool));
        for (const resource of workflow.resources ?? []) {
          const resourcePath = join(dirname(skillPath), resource);
          mkdirSync(dirname(resourcePath), { recursive: true });
          written.push(writeIntegrationFile(resourcePath, workflowResource(workflow, resource), tool));
        }
      }
    }
  }
  return written;
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

function removeSkillIntegration(skillDir: string, workflow: Workflow): void {
  for (const resource of workflow.resources ?? []) {
    const path = join(skillDir, resource);
    if (existsSync(path)) rmSync(path);
    removeEmptyDir(dirname(path));
  }
  const skillPath = join(skillDir, 'SKILL.md');
  if (existsSync(skillPath)) rmSync(skillPath);
  removeEmptyDir(skillDir);
}

function targetHasIntegrations(root: string, dirs: TargetDirs): boolean {
  for (const workflow of WORKFLOWS) {
    if (existsSync(join(root, dirs.commands, `${workflow.name}.md`))) return true;
    if (dirs.skills !== undefined) {
      const skillDir = join(root, dirs.skills, workflow.name);
      if (['SKILL.md', ...workflow.resources ?? []].some((path) =>
        existsSync(join(skillDir, path)))) return true;
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
        removeSkillIntegration(skillDir, workflow);
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
        removeSkillIntegration(skillDir, workflow);
      }
    }
  }
}

export function integrationSummary(root: string, written: ToolIntegration[]): string[] {
  return written.map((item) => `  ${item.outcome} ${relative(root, item.path)} (${item.tool})`);
}

/**
 * A distinctive sentence from the section body. The init workflow allows an
 * agent to "update an equivalent section", so a section with a reworked
 * heading still counts; this phrase is what makes that honest instead of a
 * heading-only match.
 */
export const STANDING_ORDERS_RULE = 'Record an ADR when an architectural choice';

/**
 * The task-start inventory command, as the language-neutral anchor. A
 * translated standing-orders section loses every English sentence — the field
 * finding behind this anchor is a fully Chinese AGENTS.md that carried the
 * real rules and still tripped the missing-section note — but the CLI
 * invocations survive translation verbatim, and a repo whose AGENTS.md runs
 * `adrkit list` at task start reads adr/ however the surrounding prose reads.
 */
export const STANDING_ORDERS_COMMAND = 'adrkit list';

/**
 * The agent instruction file that carries the standing-orders section, or
 * undefined when AGENTS.md does not. A section counts through its heading,
 * its rule sentence, or its task-start command — the last anchor keeps
 * translated sections honest (see STANDING_ORDERS_COMMAND). Reading only —
 * the file belongs to the user, and the CLI never rewrites it. CLAUDE.md is
 * deliberately not a carrier: Claude Code reads AGENTS.md directly since
 * v2.1.277, and no other tool reads CLAUDE.md, so a second instruction file
 * would double the paste and verification surface without serving any tool.
 */
export function standingOrdersFile(root: string): string | undefined {
  try {
    const text = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    if (
      text.includes(STANDING_ORDERS_HEADING) ||
      text.includes(STANDING_ORDERS_RULE) ||
      text.includes(STANDING_ORDERS_COMMAND)
    ) {
      return 'AGENTS.md';
    }
  } catch {
    // Absent or unreadable: the file carries no section.
  }
  return undefined;
}

/**
 * Where to refresh the standing orders from: the installed init skill when
 * integrations are present, the README otherwise. Names a source; never a
 * rewrite.
 */
function initSkillReference(root: string): string {
  for (const key of Object.keys(TARGET_DIRS) as IntegrationTarget[]) {
    const skills = TARGET_DIRS[key].skills;
    if (skills === undefined) continue;
    const path = join(root, skills, 'adrkit-init', 'SKILL.md');
    if (existsSync(path)) return relative(root, path);
  }
  return 'the adrkit-init workflow (see the adr-kit README)';
}

/**
 * The note for init/update output when no instruction file carries the
 * standing orders. Integration files being installed is what makes the
 * paste step meaningful, so an empty selection (an explicit `--tools none`
 * opt-out) stays quiet. The pointer is derived from what is actually
 * installed: a `--workflows` subset without the init workflow cannot name a
 * file that does not exist.
 */
export function standingOrdersNote(
  root: string,
  integrations: ToolIntegration[],
): string | undefined {
  if (integrations.length === 0) return undefined;
  if (standingOrdersFile(root) !== undefined) return undefined;
  return [
    'note: AGENTS.md does not carry the standing orders, so agents will not read',
    '  adr/ at task start. Paste the "Reading architecture decisions" section',
    `  from step 4 of ${initSkillReference(root)} into AGENTS.md.`,
  ].join('\n');
}

/** The marker an AGENTS.md section carries when reconciled with a template. */
const STANDING_ORDERS_MARKER_RE = /<!--\s*adrkit:\s*standing-orders\s+([0-9a-f]+)\s*-->/;

/**
 * The drift note for a standing-orders section whose marker does not match
 * the current template: pasted from a different template generation, or
 * pasted before the marker existed. Reading only — the file belongs to the
 * user, and the note names the refresh source instead of rewriting anything.
 * Quiet when AGENTS.md carries no section (the missing-section note owns
 * that case) or when the marker matches the shipped template.
 */
export function standingOrdersDriftNote(root: string): string | undefined {
  if (standingOrdersFile(root) === undefined) return undefined;
  let text: string;
  try {
    text = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  } catch {
    return undefined;
  }
  const source = `step 4 of ${initSkillReference(root)}`;
  const match = STANDING_ORDERS_MARKER_RE.exec(text);
  if (match === null) {
    return `note: the standing orders in AGENTS.md predate template marking; compare the section with ${source} and refresh it with the current marker`;
  }
  if (match[1] === STANDING_ORDERS_MARK) return undefined;
  return `note: the standing orders in AGENTS.md were pasted from a different template than this adr-kit ships; compare the section with ${source} and refresh the marker`;
}
