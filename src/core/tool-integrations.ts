import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/**
 * What a write did to the file: `created` when it did not exist, `rewrote`
 * when it existed with different content, `unchanged` when the content was
 * already byte-identical, and `preserved` when repair kept an existing file.
 */
export type IntegrationOutcome = 'created' | 'rewrote' | 'unchanged' | 'preserved';

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
 * Languages the standing-orders section ships in. The Chinese text is the
 * canonical source: it is kept within three hundred characters, and every
 * other language is a translation of it, so a wording change lands in `zh`
 * first and propagates outward. The section states what the tool is for and
 * what belongs in a record, but never prescribes how or when to use it; what
 * an agent does with the knowledge is its own judgment.
 */
export type StandingOrdersLanguage = 'zh' | 'en';

export const STANDING_ORDERS_SECTIONS: Record<
  StandingOrdersLanguage,
  { heading: string; body: string }
> = {
  zh: {
    heading: '## 架构决策记录',
    body: '本仓库用 `adr-kit` 这个 npm 包管理架构级决策，记录保存在 `adr/` 目录。可以用 `adrkit list` 列出全部记录，`adrkit show <编号>` 读取某一条，`adrkit relevant <路径>` 查找与某文件相关的记录。记录是有代价的：每记一件事，就要在代码之外多维护一份真相源。但记录又是必要的——代码只是根因衍生的现象，知道根因却不记录，未来的 agent 只能从代码反猜。例行修改留给 Git 和测试；没有值得记的就跳过。何时记录的四问与写法见 `adrkit-propose`、`adrkit-record` 技能。',
  },
  en: {
    heading: '## Architecture decisions',
    body: 'This repository uses the `adr-kit` npm package to keep architecture-level decisions; the records live in `adr/`. Browse them with `adrkit list`, read one with `adrkit show <N>`, and find the records relevant to a file with `adrkit relevant <path>`. Recording has a cost: every record is a second source of truth to maintain outside the code. It is also necessary — code is only the symptom a root cause produced, and a root cause left unrecorded forces future agents to reverse-guess it from the code. Routine edits belong to Git and tests; skip what is not worth recording. The `adrkit-propose` and `adrkit-record` skills carry the four-question recording test and the format.',
  },
};

/**
 * The section — heading plus body, nothing after it — that the init workflow
 * asks agents to paste into AGENTS.md in the repository's language. No
 * generation marker follows: the text is awareness-only and user-owned, so a
 * difference from the template is expected rather than a drift signal, and
 * template changes are announced through release notes and the upgrade guide.
 */
export function standingOrdersSection(language: StandingOrdersLanguage): string {
  const section = STANDING_ORDERS_SECTIONS[language];
  return `${section.heading}\n\n${section.body}`;
}

const RECORDING_GUIDANCE = `## When to record

Preserve important context missing from existing sources, especially context held only in a user conversation. Honor explicit user requests to preserve a choice without making similar edits record-worthy.

Before creating or shaping a record, answer these four questions:

1. **Can code, tests, or Git explain this choice?** If yes, it is not an ADR.
2. **Does the record only say "we did X" while X is visible in the code?** If yes, it is not an ADR.
3. **Is the constraint or reason behind it hidden and durable enough to guide future choices?** If no, it is not an ADR.
4. **Is this a routine upgrade, naming change, format migration, visual tweak, or process ritual?** If yes, it is not an ADR.

Use judgment, not a score or an all-must-pass checklist. If nothing meaningful would be lost, or forgetting it would cost nothing, skip without a justification field, user approval, or deferred note. Notes are candidates, not commitments to ADRs.

| Usually leave to existing sources | Potentially worth preserving |
| --- | --- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden |
| Selected a library; the manifest already shows which one | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable |

Judge information, not topic names; an existing record is not precedent for recording similar edits. Update only claims made false by a change; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest moving details to their existing owner or authorized archival when the rationale no longer guides work. Do not silently rewrite choices, ignore constraints, delete a record, or archive it without authorization.
`;

// Author workflow text here. npm run build exports skills/<name>/SKILL.md;
// test/integrations.test.ts checks that the committed outputs are current.
export const WORKFLOWS: Workflow[] = [
  {
    name: "adrkit-init",
    description: "Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.",
    body: `# ADR Kit Init

Installing ADR Kit puts a repository's decision memory where agents can see it: records live in \`adr/\`, and the \`adrkit\` CLI reads them. Run \`adrkit init [path]\` for a new repository, or to repair an existing \`adr/\` whose \`config.yaml\` is missing. Repair fills missing files and preserves existing records and integrations. Use \`adrkit update\` to refresh integrations in an initialized repository. Confirm the four lifecycle folders: \`proposed/\`, \`implemented/\`, \`rejected/\`, and \`archived/\`. The CLI installs workflow skills but does not rewrite a project's AGENTS.md.

Record language follows the repository: match the language of existing records, or the user's language when the repository has no records yet, and keep that language for both titles and bodies rather than switching per conversation.

Offer one of the sections below for \`AGENTS.md\` — suggest the one matching the repository's language, judged from the existing AGENTS.md, README, and records, defaulting to English when nothing decides — and paste it only with the user's agreement. A section in another language is a translation of the Chinese source; translate it and keep the \`adrkit\` invocations verbatim. If AGENTS.md already mentions adrkit in the user's own words, respect that text and suggest nothing. The section names the tool and the record-worthiness bar, and leaves whether or when an agent runs the commands to its judgment.

${standingOrdersSection('zh')}

${standingOrdersSection('en')}

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.`,
  },
  {
    name: "adrkit-grill",
    description: "Use when the user asks to grill a plan or an important decision needs interrogation; explore the design against active records, then preserve only outcomes worth recording.",
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

${RECORDING_GUIDANCE}

Apply the same selection judgment after grilling; discussion alone does not require a record. If no outcome qualifies, summarize the conclusions in conversation and create no record. When an outcome qualifies, preserve the complete session tree in its Deliberation appendix, including local choices as context rather than separate ongoing obligations. Usually one primary record holds the tree; split only qualifying choices that can be superseded independently. An unshipped outcome goes to \`adrkit propose\`, even when the direction is settled. Fill \`## Problem\`, \`## Proposal\`, \`## Alternatives considered\`, \`## Acceptance criteria\`, and \`## Risks\` from actual answers. Keep the tree in an optional \`## Deliberation\` appendix: prefix questions \`Q:\`, options \`A:\`, tag nodes \`[settled]\`, \`[rejected]\`, or \`[open]\`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use \`adrkit record\` with truthful \`--raised-by\` and \`--decided-by\` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with \`adrkit supersede --by\` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles alone. Run \`adrkit validate <name>\` after filling the record. Report which outcomes are proposals, not implemented guidance; \`adrkit implement\` is reserved for work that actually ships.`,
  },
  {
    name: "adrkit-visualize",
    description: "Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.",
    resources: ['examples/decision-atlas.html'],
    body: `# ADR Kit Visualize

Seeing the decision set as a picture surfaces relationships and contradictions that a file list hides.

Visualize existing records only when asked. Run \`adrkit list\` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- The default visualization is the decision atlas (explicit \`--format html\` keeps this same object): \`adrkit atlas --out "<path>.html"\`. It includes implemented guidance and archived history, with archived records kept visually distinct and their bodies published in full. This is the answer to "visualize this repository's ADRs" with no further qualifier. The page chrome is English by default; pass \`--lang zh\` when the reader uses Chinese.
- For one record's deliberation tree, use \`adrkit atlas --record <name>\` and save stdout to a local HTML file. If no \`## Deliberation\` appendix exists, say so instead of fabricating one.
- For the decision map alone, use \`adrkit atlas --map --format html --out "<path>.html"\`; for source exports, \`adrkit atlas --map --format mermaid|dot|text\`. For a tree's source, use \`adrkit atlas --record <name> --format mermaid|text\`; \`--map\` and \`--record\` are mutually exclusive. Use \`--formal-only\` only when requested or useful to the question.
- Text and Mermaid may be enough for docs; do not generate HTML merely because the CLI supports it.

## Theme selection

Folio (warm paper, editorial typography) and Signal (dark surfaces, cyan accents,
compact layout) are independent themes with the same atlas capabilities.
The agent owns selection; do not make the user choose a theme as a setup step.

1. Honor an explicit theme request or a clearly stated visual preference with
   \`--theme folio\` or \`--theme signal\`. If the user requests randomness, use
   \`--theme random\`.
2. When updating an existing atlas, preserve its concrete \`data-atlas-theme\`
   value by passing that named theme, unless the user requests another theme
   or a fresh random choice.
3. For a new atlas without a clear preference, omit \`--theme\`: the CLI default
   renders Signal. Do not guess a preference from the project category,
   the reader's identity, or the operating system; do not prompt for a theme.

Omitting \`--theme\` renders Signal; \`--theme random\` rolls a fair 50/50 coin
between Folio and Signal once at generation.
The resulting file keeps that theme. Do not add system appearance detection,
a page switch, or a runtime reroll. Theme selection is unavailable for
standalone maps and record trees.

Both themes retain the same record scope, complete archived bodies, pinned
source links, bilingual copy, offline behavior, map gestures and bounds,
relationship focus, timeline, local search, reader navigation and keyboard
behavior. Absent modules and their chapter entries disappear, the chapters
renumber, and legends show only symbols actually present. Insight panels use
measured complete rows near 40rem with a 50rem ceiling, including on narrow
screens; sparse content stays short. Empty reference directions disappear,
and when both are empty the relation area and its lower divider disappear.
Preserve these mechanisms when adapting either theme; change only the
presentation the user requested. Both themes keep the source link in the reader
header; Folio styles it as a quiet padded control and Signal as its original
text link. On viewports up to 760px, both themes hide the map's on-screen
legend to keep the canvas clear; map controls and interactions remain available.
Desktop keeps the data-dependent legend. Both heroes fill at least the viewport
below the chapter bar. Folio keeps its original title/introduction/actions/statistics/
decision-density group and proportions. On desktop the introduction and density
regions share spare height, balancing whitespace around the statistics while the
lower rule meets the viewport bottom; only shorter windows
compress vertical spacing, without shrinking type or the chart; Signal keeps
statistics at the bottom of its hero. Taller content can scroll.


Display ADR identifiers, chapter numbers and question numbers as natural
integers without leading zeros (ADR 3, chapter 2, QUESTION 1), including visible
labels and accessible names. Date/time fields retain their standard formats.

Signal's built-in hero is a shuffled desk of real decision files, not a static
illustration. Generate it with \`adrkit atlas --theme signal --out "<path>.html"\`
and preserve its shared template behavior when adapting the page: up to three
same-material folder covers, desktop landscape/mobile near-square proportions,
irregular overlapping angles and depth-specific contact shadows,
top-file extraction followed by reader expansion, replenishment without duplicate
files, and a quiet reset only after exhaustion that returns all files and reshuffles.
Use the target repository's records and counts; zero, one or two records must
remain honest. Desktop hero picks open the reader on the left with the ordinary
dimming/blur backdrop over the right-hand desk. Clicking that backdrop only
closes the reader; opening the next file takes a separate card click. Other
entry points and mobile keep the right reader. Keep all four statistics inside
the hero, no bottom arrow, and automatic entrance effects confined to the hero;
respect reduced motion. The runtime file shuffle is independent of the one-time
choice of atlas theme. Do not replace this mechanism with decorative sample cards.

## Optional decision-atlas example

Use the atlas for the whole set, the map when only relationships matter, and the deliberation tree for one record. Do not generate a separate page when the built-in atlas already answers the question.

The default \`adrkit atlas\` output uses [the decision-atlas example](examples/decision-atlas.html) through its \`atlas:\` slots. Open the example when the page needs adapting beyond what the slots fill. It is an offline reference snapshot of ADR Kit's own public records, not a template that must be followed. Inspect only the layout or interaction code needed; the embedded sample data is not instruction context. Reuse the useful parts; sections, chapter-bar entries, and legend or timeline keys whose data is absent hide themselves at runtime, the chapter bar renumbers, so no empty block survives. A timeline, relationship map, local-search directory, reference counts, and replacement chains are options, not a required checklist.

Generate a fresh artifact from the target repository's records and the CLI's relationship output; replace all sample records, counts, dates, titles, paths, and links. Do not invent relationships, infer provenance, or copy another repository's contents. Keep archived history visually distinct from current authority, and publish archived bodies in full: the folder already carries the importance signal for agents, and a reader who opens an archived record wants its text. Resolve record links for the delivered file's location, as \`atlas --map --format html --out\` does. Preserve the \`--record <name>\` route; the example does not supply missing deliberations.

The example marks its replaceable regions with \`atlas:\` comments — HTML around the title, hero, statistics, section notes, map, and footer, and a JavaScript comment around the records array. Replace what is inside a marker; keep the markers only when the page should stay regenerable from the same example.

To build one from the example, follow these steps in order:

1. Read only \`adr/implemented/\` and \`adr/archived/\` records — the same scope as \`adrkit atlas\`. Build one records entry per file: the front matter fields in order, then \`number\` and \`title\` from the \`# ADR:\` line, the raw Markdown body (archived bodies in full), \`path\`, \`source\` (the record's blob URL at the pinned commit), and \`lifecycle\`. Determine \`lifecycle\` from the containing directory: \`implemented\` for \`adr/implemented/\`, \`archived\` for \`adr/archived/\`, regardless of \`status\`. Ordinary archives retain \`status: implemented\`; only records with \`superseded-by\` have a successor.
2. Run \`adrkit atlas --map --format html\` and keep its \`<svg>\` inline together with its canvas script. Rewrite each node link to an in-page \`#adr-N\` anchor and give the group the same id; the reader dialog, timeline, and directory search read the records array and the map edge attributes, so keep the class names and data attributes intact.
3. Compute the section notes from the repository's own numbers: record count, the first-to-last created date span and the number of distinct days that carry records, the densest day, the most-referenced implemented record, and the archived count. Never carry another repository's numbers into prose. The hero names the project once: the h1 is the name the repository declares for humans — its README or site title, else the repository name as written, in its Chinese form when the repository declares one; never translate, abbreviate, or substitute a suffixed package name. With the name in the h1, the eyebrow states only the genre and the lead paragraph opens with the archive's substance.
4. In the footer, pin the commit the records were read from (\`git rev-parse --short HEAD\`) and link it to the remote tree URL, so the page is traceable to an exact state.
5. Keep the example's legend, reader dialog, pagination, and back-to-top behavior and structure unchanged — they are repository-agnostic; translate their visible copy into the user's language, and vary the data and the short prose blocks.

For an adapted long page, keep navigation compact and the directory search local. Vertical wheel and finger swipes should scroll the page; explicit drag or horizontal gestures pan the map, while pinch or Ctrl/⌘ + wheel zooms. Bound panning on both axes and center drawings that fit. Match the user's language and styling preferences. Keep one vertical rhythm: every section boundary should read as the same gap, so wrapper padding never stacks with section padding. Check the resulting page at desktop and mobile sizes, including record opening, navigation, search, canvas bounds, and page scrolling over the map; after sections hide, confirm the chapter bar renumbered contiguously and every entry still resolves; keep it usable offline.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless \`atlas --out\` is used; the agent owns the browser handoff.`,
  },
  {
    name: "adrkit-propose",
    description: "Use when an unshipped choice has important constraints or reasons that existing sources do not preserve, especially context held only in conversation; assess whether it merits a proposal.",
    body: `# ADR Kit Propose

A proposal preserves important context for an unshipped choice before that context evaporates.

${RECORDING_GUIDANCE}

Before writing, run \`adrkit list\` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Read \`adr/notes.md\` too — its unshaped lines are the likeliest raw material for this record. Judge overlap from record content, not titles alone; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: create a proposal linking the decision it will replace; keep the implemented decision active until the replacement ships. After shipping, use \`adrkit implement\` and resolve the old decision with \`adrkit supersede --by\` in the same delivery change. A proposal is intent, not duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Then run \`adrkit propose "<title>"\`; it creates a dated, unnumbered file in \`adr/proposed/\`. Write a one-sentence description explaining when to read the record, then fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run \`adrkit validate <name>\` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.`,
  },
  {
    name: "adrkit-note",
    description: "Use when important context may be lost during a task and cannot yet be shaped; capture one candidate line, without committing to a future ADR.",
    body: `# ADR Kit Note

The note buffer preserves important context that may otherwise disappear while work continues. Capture only potentially useful missing context; routine upgrade events and visual tweaks need no note. Before shaping a note, use the recording judgment in propose or record. A note may be discarded when it has no independent value; it is not a promise to create an ADR.

Run \`adrkit note "<one line>"\`; it appends a timestamped line to \`adr/notes.md\`, creating the file on first use. The buffer is a plain file outside the lifecycle — no front matter, no template, no number — and \`adrkit validate\` ignores it: notes are debt, not authority, and never a fifth lifecycle folder. Shape one when the moment allows — \`adrkit propose\` and \`adrkit grill\` read the buffer as candidate material, and \`adrkit record\` takes an already-shipped choice straight from it — and delete a line that shaped nothing. \`adrkit list\` and \`adrkit instructions\` count the unshaped lines so the debt stays visible.


When a source is already available, retain a PR/discussion link, commit, or attributed statement in the same line; capture must stay cheap and a source is optional. Distinguish a settled choice from a candidate needing confirmation, for example \`Candidate: use SQLite; rationale unknown; source: PR #42\`. Do not create alternatives or infer who decided from a transcript author, Git identity, or approval. Before shaping a note, inspect its source and resolve unknowns; a note proves neither a choice nor delivery.`,
  },
  {
    name: "adrkit-record",
    description: "Use when a shipped choice has important constraints or reasons that existing sources do not preserve; assess whether to record that missing context directly.",
    body: `# ADR Kit Record

Recording a shipped choice preserves important context that later tasks could otherwise lose.

${RECORDING_GUIDANCE}

First run \`adrkit list\` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles alone — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with \`adrkit supersede --by\` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update facts the existing record actually claims rather than recording a new one; changes within its implementation freedom need no update. A changed recorded choice needs a new record and an explicit relationship. Run \`adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>\`. Write a one-sentence description explaining when to read the record, then fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use \`human\` for a person's judgment, \`agent\` for the agent's; passive human approval does not change an agent-origin choice. Run \`adrkit validate <N>\`.`,
  },
  {
    name: "adrkit-validate",
    description: "Use when checking ADR record format before implementation, rejection, archival, or commit.",
    body: `# ADR Kit Validate

Validation keeps the record set a dependable memory: a format contract only works when drift fails loudly.

Run \`adrkit validate [name]\` for one record or \`adrkit validate\` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until its description and required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.

Repository-wide validation checks archived records like any other record. If it reports a format or path error in an archived file, migrate it in a normal Git commit with a reason and re-run; do not leave validation red. Before pushing, \`git diff <base> -- adr/archived\` shows what changed; there is no separate seal or \`validate --base\`.`,
  },
  {
    name: "adrkit-implement",
    description: "Use when a proposal has shipped and should become a numbered, active decision.",
    body: `# ADR Kit Implement

Promotion is what makes \`implemented/\` trustworthy authority — shipped guidance rather than intent — so later tasks can rely on what they read in full.

Before promotion, recheck the recording judgment in the propose workflow: a proposal's existence is not proof of value. If only routine facts remain, explain that and suggest an appropriate disposition instead of promoting automatically. Respect explicit user intent; do not silently delete or reject the proposal.

Confirm the proposal's work is shipped, not merely accepted for review. Compare the record's claimed paths, names, defaults, and mechanisms with the current code and tests, and check the active records for overlap with this choice: a full replacement is promoted and then resolved with \`adrkit supersede --by\` in the same change, while a partial replacement keeps the older record active and links both. Run \`adrkit show <name>\` and \`adrkit validate <name>\`; resolve errors. Then run \`adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>\`. The command assigns the next stable ADR number, rewrites proposal sections into a shipped decision, moves the record from \`proposed/\` to \`implemented/\`, and preserves \`created\` and \`description\`. It folds acceptance criteria into \`### Verification\` and risks into \`### Trade-offs\` under \`## Consequences\`; it warns because the CLI cannot rewrite prose. Rewrite those subsections as present-tense shipped facts, inspect the generated Decision and Consequences for proposal-era language, then validate the numbered record. Do not infer the two provenance declarations from the command runner.`,
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
- Check whether a new or maintained record preserves important, otherwise hidden context; weigh importance, impact breadth, longevity, and resistance to becoming stale. Routine upgrade events or visual adjustments are not automatically decisions. An existing record is not precedent for similar records. If repeated synchronization comes only from volatile details, name the burden and their existing owner; suggest trimming details or authorized archival, without silently rewriting constraints or retiring records. Changes within a decision's implementation freedom need no update unless an actual claim becomes false.
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

Confirm the record has shipped, its distinct rationale no longer guides future work, and current behavior has another authoritative owner. Do not archive by age or quota. Run \`adrkit archive <name> --reason "<owner and why retired>"\`. The numbered record moves from \`implemented/\` to \`archived/\` — the lowest-value folder: frozen history, not current authority, and not read by default. Its number and history remain. Validate afterward. Git records later changes; a format or path issue is a normal migration commit rather than an unfixable frozen record. If a newer implemented decision fully replaces it, use \`adrkit supersede --by\` instead; partial replacement leaves the still-relevant record active.`,
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
export function renderWorkflowSkill(workflow: Workflow): string {
  return `---
name: ${workflow.name}
description: ${workflow.description}
---

${workflow.body}
`;
}

/** Write one integration file and report what the write actually did. */
function writeIntegrationFile(path: string, content: string, tool: string, preserveExisting: boolean): ToolIntegration {
  if (preserveExisting) {
    try {
      writeFileSync(path, content, { flag: 'wx' });
      return { tool, path, outcome: 'created' };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      return { tool, path, outcome: 'preserved' };
    }
  }
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
  options: { preserveExisting?: boolean } = {},
): ToolIntegration[] {
  const preserveExisting = options.preserveExisting === true;
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
          preserveExisting,
        ),
      );
    }
    if (dirs.skills !== undefined) {
      for (const workflow of selected) {
        const skillPath = join(root, dirs.skills, workflow.name, 'SKILL.md');
        mkdirSync(dirname(skillPath), { recursive: true });
        written.push(writeIntegrationFile(skillPath, renderWorkflowSkill(workflow), tool, preserveExisting));
        for (const resource of workflow.resources ?? []) {
          const resourcePath = join(dirname(skillPath), resource);
          mkdirSync(dirname(resourcePath), { recursive: true });
          written.push(writeIntegrationFile(resourcePath, workflowResource(workflow, resource), tool, preserveExisting));
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
 * The inventory command, as the language-neutral anchor. A section translated
 * into a language the registry does not ship loses every known heading, but
 * CLI invocations survive translation verbatim — an AGENTS.md that names
 * `adrkit list` already tells its agents the tool exists.
 */
export const STANDING_ORDERS_COMMAND = 'adrkit list';

/**
 * The agent instruction file that carries the awareness section, or undefined
 * when AGENTS.md does not. A section counts through a known localized heading
 * or the command anchor — the last keeps sections in untranslated languages
 * honest (see STANDING_ORDERS_COMMAND). Reading only — the file belongs to
 * the user, and the CLI never rewrites it. CLAUDE.md is deliberately not a
 * carrier: Claude Code reads AGENTS.md directly since v2.1.277, and no other
 * tool reads CLAUDE.md, so a second instruction file would double the paste
 * and verification surface without serving any tool.
 */
export function standingOrdersFile(root: string): string | undefined {
  try {
    const text = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    const headings = Object.values(STANDING_ORDERS_SECTIONS).map((section) => section.heading);
    if (headings.some((heading) => text.includes(heading)) || text.includes(STANDING_ORDERS_COMMAND)) {
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
 * The note for init/update/instructions when no instruction file mentions
 * adrkit. Integration files being installed is what makes the paste step
 * meaningful, so an empty selection (an explicit `--tools none` opt-out)
 * stays quiet. The pointer is derived from what is actually installed: a
 * `--workflows` subset without the init workflow cannot name a file that
 * does not exist. Without a write result, inspect installed files; callers
 * must also respect an explicit configuration opt-out. The note offers, never
 * mandates — the section is optional awareness, not a requirement.
 */
export function standingOrdersNote(
  root: string,
  integrations?: ToolIntegration[],
): string | undefined {
  const hasIntegrations = integrations === undefined
    ? Object.values(TARGET_DIRS).some((dirs) => targetHasIntegrations(root, dirs))
    : integrations.length > 0;
  if (!hasIntegrations) return undefined;
  if (standingOrdersFile(root) !== undefined) return undefined;
  return [
    'note: AGENTS.md does not mention adrkit, so agents may not discover it.',
    `  Optionally add the matching-language section from ${initSkillReference(root)}`,
    '  to AGENTS.md, preserving existing project rules; Chinese and English are included.',
  ].join('\n');
}
