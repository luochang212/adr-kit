# Changelog

## 0.14.0

### Minor Changes

- ed77d77: Seal archived records and govern the lifecycle loop. `adrkit init` writes
  `adr/archived/MANIFEST.json`; `archive` and `supersede` append a SHA-256 seal,
  `validate` checks it, and `validate --base <git-ref>` proves the archive only
  grows. The installed skills now require a scoped supersession check when
  creating a record and shipped-fact checks on delivery, with a new
  `adrkit-review` workflow.
- ed77d77: Organize records by lifecycle. Records now live in `adr/proposed/`,
  `adr/implemented/`, `adr/rejected/`, and `adr/archived/`; `adrkit accept`
  becomes `adrkit implement` and `adrkit decide` becomes `adrkit record`, and
  the old `adr/decisions/` and `.drafts/` layouts are gone. This is a breaking
  rename for a pre-1.0 package, shipped as a minor bump with no migration layer.

### Patch Changes

- 4e20c7c: Require `adr/archived/MANIFEST.json` even when the archive is empty, so
  `validate` reports a missing manifest instead of passing an empty directory,
  and fail base-aware validation when the manifest exists at the base but cannot
  be read, instead of treating an unreadable base as "no prior seals".

## 0.13.0

### Minor Changes

- f6e82f5: `adrkit init` and `adrkit update` print a note when neither AGENTS.md nor
  CLAUDE.md carries the standing-orders section ("Reading architecture
  decisions"): the integration files are installed, but agents read adr/ at
  task start only if that section has been pasted in. The check is read-only
  (the CLI never rewrites the instruction file), and an explicit
  `--tools none` opt-out stays quiet.

### Patch Changes

- acb2d03: Harden record reading against crafted input. A section's "written content" now
  means text outside HTML comments: an unterminated `<!--` is not content and
  swallows the rest of the section, so a draft whose sections hold only comment
  markers is refused instead of reported ready to accept, and a durable record
  with such a section fails validation. The comment strip is a single linear
  scan, so a record carrying hundreds of kilobytes of unterminated markers no
  longer makes `validate`, `status`, or `instructions` run for minutes. A path
  read as a record must resolve to a regular file: a directory, FIFO, socket, or
  device — including a symlink to one — is reported by its kind instead of being
  read; previously a FIFO blocked the read and a link to `/dev/zero` read
  forever. A symbolic link to a regular file is still read as a record.

## 0.12.0

### Minor Changes

- 709fed2: Detect drift between the CLI and the installed skills. `init` and `update`
  stamp `installed-with:` into `adr/config.yaml` with the version that wrote the
  integrations; `list` and `instructions` compare it against the running CLI,
  and `config` reports the stamp. When they differ, `list` and `instructions`
  append a one-line
  note — a newer CLI suggests `adrkit update` to refresh the skills, an older
  one says to upgrade — so a stale install explains itself instead of failing
  later with an error that names no cause. Repositories configured before the
  stamp existed stay quiet, and an explicit integrations opt-out never nags.

### Patch Changes

- e4fead5: Fix defects found in a whole-repository review (report at
  `docs/reviews/2026-09-23-whole-repository.md`). `adrkit tree --text` and
  `--mermaid` now agree with `--html` on the override signal; a bracketed state
  word inside prose is no longer consumed as a marker; a reason splits on the
  first ` — `. `supersede` refuses a replacement that is not an accepted decision
  and refuses to drop an unknown front-matter key. `list` and `instructions` no
  longer fail when `adr/config.yaml` is malformed, and the drift notice ignores a
  stamp that is not a parseable version. Commands reject options they do not take
  (for example `--out` outside `graph`). `check:upstream` verifies the vendored
  grilling copies against the manifest.

## 0.11.0

### Minor Changes

- 059da29: Add `adrkit graph --out <path>`: the command writes the artifact itself and
  resolves the decision map's record links against that location, so a map written
  outside the repository still opens its records.
- 67b1488: Split viewing existing ADRs into the `adrkit-visualize` workflow, leaving
  `adrkit-grill` focused on questioning and recording decisions. Install it with
  `adrkit init` or `adrkit update`, or select `--workflows visualize`.
  Visualization requests now open the generated HTML in the default browser and
  also return a file link; file-only requests and unavailable browsers retain the
  link without requiring a separate opening request.
  The visualize workflow writes the map with `--out`, so its record links
  resolve against wherever the file lands — a temporary directory included.
- 059da29: Share the offline views as a branded PNG. Both HTML views now carry a camera
  button in the toolbar — the action makes a picture of the view rather than
  sending one, so it is labelled Save as image rather than Share. It renders the
  whole diagram on the client, the map serializing its SVG and the tree
  rasterizing its laid-out cards, and frames it to the diagram's own shape: a
  heading on the canvas above the diagram saying what the image is (the view, its
  title, its statistics), and a one-line footer fused into the bottom edge
  crediting the GitHub mark and `luochang212/adr-kit` beside the date.
  
  Because the button carries an icon instead of a label, feedback is a status
  line: it reports the saved file name and whether the copy reached the
  clipboard, and never claims a folder — where a download lands is the browser's
  decision, which a page cannot override. The image is downloaded and, where the
  clipboard allows it, copied as well; nothing is uploaded and the page stays
  self-contained.
- e44c73f: Highlight direct relationships in decision maps and ancestor/descendant paths in deliberation trees on hover or keyboard focus. Route map edges through facing card sides with separate attachment points and same-date loops. Image exports preserve normal brightness regardless of temporary emphasis.
- 059da29: Group multi-decision deliberation trees in the `--html` card view under one
  dashed virtual deliberation card, so the decisions a grilling session settled
  together read as a single tree instead of unrelated islands. Single-root
  records render exactly as before, and the text and Mermaid views are
  unchanged; the stored outline remains the source of truth.

### Patch Changes

- 059da29: Make the offline canvases pan from anywhere: a press that moves pans the view
  wherever it started — card, node, or link — and suppresses the click it began
  on, while a press that stays put keeps its native click, so map nodes still
  open their records. Canvas text is no longer selectable; buttons and
  disclosures keep their native clicks, and the record file remains the place to
  copy text from.
- 059da29: Give offline decision maps and deliberation trees more canvas space with a
  shared compact toolbar, and keep the orientation aids on the canvas itself: a
  bottom-left legend panel and a bottom-right zoom cluster. The Info disclosure
  is an icon whose panel keeps the full title, the labeled statistics, and the
  gesture hints, set apart from the headline count by a hairline divider; the
  Share action closes the toolbar. The toolbar's icon buttons are square and set
  close together as one cluster, and narrow screens collapse back to a single
  row. The ADR Kit brand carries the GitHub mark and opens the repository in a
  new tab, so a reader who wants the source does not lose the view.
- 059da29: Remove the Expand all options button from the deliberation tree toolbar. The
  toolbar keeps the title, headline count, and Info; individual cards keep their
  own collapse toggles and options disclosures.
- 059da29: Show a label only where the picture has its object. A deliberation card chips
  its state only when it is an exception — `settled` is what a node is when
  nothing else is said, and the chosen answer already reads as settled — while a
  folded option keeps its state as plain text. In both offline views the legend
  now keys only the marks the view draws: the selected-answer key waits for a
  settled option, the override key for a question that took other than the
  recommendation, and the map's supersede, reference, and deliberation keys for
  their edge or marker. A view with nothing to key draws no legend panel, and the
  Info panel lists a statistic only when its count is non-zero.
  
  The tree's edge keys now carry a line sample in the stroke they name, and the
  tree draws exactly two edge styles to name: the gray dependency link and the
  green frontier link a settled choice gives its follow-up. The third, lighter
  stroke that marked nested links is gone, because its rule also fired for the
  session card's edges and so no honest label covered it.
  
  Whether a follow-up question was unlocked is now decided once in the outline
  layer and recorded on the card, so the drawn edge, the legend, and Mermaid read
  one answer instead of each deriving its own.
- 059da29: Give a decision-map card's tags the whole footer row, cut where they reach the
  card edge, and let the map's drawing box grow to hold the connecting curves, so
  a long backward edge is drawn in full rather than clipped at the map's edge.
  The box is sized to the curves themselves rather than to their control points,
  which used to leave the map floating in a frame nearly twice the width of its
  card grid.
- 059da29: Keep the folded answers of a deliberation root card readable. The selected
  answer box now carries an explicit dark color instead of inheriting the root
  card's white text onto its light background, and the alternatives disclosure
  inside a root card gets light-on-dark colors instead of the light-card grays.
- 059da29: Improve image exports with a prominent, width-scaled title, separate view and ADR labels, and measured wrapping that preserves long titles and statistics. Keep the heading free of background dots and enlarge the footer credit.
  
  Let decision maps lead directly with their title; keep the ADR number and view label above individual deliberation titles.
- 059da29: Include the visible diagram’s legend in saved images, preserving its symbols and wrapping it to fit. Hide tree disclosure glyphs in the exported copy while retaining alternative counts and expanded content.
- 58543de: Allow successive supersession chains to pass repository and single-record
  validation without rewriting historical links. Detect missing downstream targets,
  cycles, and chains that do not terminate at an accepted decision.
- 059da29: Open the offline views in a readable fit: the diagram is fitted to the width
  and never past 1:1, so a tall deliberation tree pans instead of shrinking to a
  thumbnail whose text cannot be read. Fit in the dock still shows the whole
  diagram at once, and the shared controller owns the initial view for both.

## 0.10.0

### Minor Changes

- 6595b21: Give both offline HTML views one shared interactive canvas: pan, zoom,
  fit-to-view, 1:1, and keyboard navigation, with a trackpad pinch zoom anchored
  at the pointer. `adrkit graph --html` becomes an interactive decision map
  rather than a static picture, and `adrkit tree --html` gains the
  pointer-anchored pinch. Inside the canvas, Ctrl/⌘ + scroll now zooms the canvas
  instead of the browser; browser zoom still works outside it. See ADR 11.
- b79fff0: Render `adrkit graph --html` as an offline, self-contained decision map: a
  bespoke static layout with supersede and reference edges, creation-date
  columns, and tag tinting. Nodes link to their record and mark the records that
  carry a `## Deliberation` tree. The grilling skill routes a single-decision
  request to `tree --html` and a whole-set request to `graph --html`. See ADR 9.
- 3af59c1: Add an annotated `## Deliberation` grammar and a richer tree view. A node can
  carry a `Q:`/`A:` type, a `[settled]`/`[rejected]`/`[open]` state, a
  `(recommended)` marker on the option the agent recommended, and a ` — reason`.
  `adrkit tree` renders distinct root, question, and option shapes with state
  colors, marks the recommended option, and marks a question whose settled option
  is not the recommendation as an override. `adrkit tree <name> --html` emits a
  single self-contained HTML document.
- 6daff41: Record dependency in the `## Deliberation` appendix by nesting: a follow-up
  question is a child of the node whose settlement raised it, so related questions
  run deeper and unrelated ones stay flat. `adrkit tree` styles the edge that
  raised each follow-up question so the tree's depth reads as the frontier, wraps
  long labels, and shows a legend in the `--html` view.
- 6daff41: Render `adrkit tree --html` as an offline interactive card tree with expandable
  options, dependency edges, branch folding, pan and zoom, and keyboard controls.
  The grilling skill generates this view only when requested and delivers a file
  link by default. Markdown remains the source; text and Mermaid exports remain
  available. See ADR 8.

### Patch Changes

- 42f4a63: `adrkit validate` now reports a record body that references a decision number
  which does not exist (`ADR-N` / `ADR N`). Previously such a reference was
  silently dropped by `adrkit graph` and never failed validation, leaving a dead
  cross-reference in an immutable record.
- 8bcf046: `adrkit graph` no longer substitutes a decision's status date for a missing
  `created` field. The record format requires `created` and `validate` already
  rejects a record without it, so the view now names the invalid record instead of
  grouping it under a fabricated birth date.

## 0.9.0

### Minor Changes

- ba15e73: Add the `adrkit-grill` workflow skill, shipped by every integration and
  selectable through `--workflows`. It interrogates the user about a decision
  (design tree, frontier rounds) until nothing is silently assumed, then records
  the settled decisions with `adrkit decide`, mapping the session's questions,
  rejected options, and overrules onto the record sections and the provenance
  fields. Method adapted from the `grilling` skill in mattpocock/skills (MIT).
- fbfea95: Add a required `raised-by` provenance field alongside `decided-by`: who put a
  decision on the table versus whose judgment settled it. Add a `## Deliberation`
  appendix that stores a grilling session's design tree as a nested outline, with
  the new `adrkit tree <name> [--mermaid|--text]` command to render it. Grilling
  now ends in `adrkit decide` only (the `grill -> propose` path is removed), and
  `decide` leads the product's hints and website demo while `propose` stays the
  supported exception.
  
  This is a breaking record-format change: every durable record must carry
  `raised-by`, and `adrkit decide` / `adrkit accept` require the new
  `--raised-by` flag.
- af0c9dc: Record every decision a grilling session settles, with no record-time
  importance filter: the session is itself the importance signal, and the ADR bar
  now governs only the direct `decide`/`propose` path. The `adrkit-grill`
  contract says so explicitly, and the reading rule and workflow docs split the
  rule into the grill path and the direct path.
  
  Pin the upstream `mattpocock/skills` grilling directory and add a hard CI gate:
  `npm run check:upstream` fails on push and pull request when the upstream path
  changes, and `npm run grilling:diff` shows the change for review. The check
  never auto-syncs the adaptation.

### Patch Changes

- 62fc433: Align `adrkit init`'s config template with the yaml library's flow-array
  emission (`tools: [ agents ]`, `workflows: [ a, b ]`, `[]` when empty), so a
  bare `adrkit update` no longer rewrites a freshly initialized
  `adr/config.yaml` (`[agents]` -> `[ agents ]`) and manufactures a spurious
  diff. Existing compact configs normalize once at the next update, then stay
  byte-stable.

## 0.8.0

### Minor Changes

- 42eb97a: `decided-by` now records who decided — a person or the agent's own judgment —
  declared by the caller instead of inferred from the environment.
  
  - The field answers one question: where did this choice come from? `human` when
    a person determined the direction — they stated it, changed an agent's
    proposal into what shipped, or the choice is being recorded after the fact.
    `agent` when the direction came from the agent's own judgment, including when
    a person only let it through without engaging with the choice. It carries
    exactly one value and is never co-signed; who proposed, redirected, or
    approved belongs in the record body.
  - `adrkit decide` and `adrkit accept` require `--decided-by human|agent` and
    refuse to write a record without it. There is no default and no inference:
    the CLI cannot observe who chose, and the old probe measured a different
    question (who ran the command), so it recorded every unrecognized agent as a
    person. The probe and the marker list are deleted, not deprecated.
  - The format allows exactly `human` or `agent`; any other value, including the
    removed `machine`, fails to load with an error naming the two. Nothing
    normalizes or back-fills it: `validate` reports a missing or unknown value and
    never rewrites a record.
  - `propose` writes nothing and takes no declaration. `supersede` preserves the
    declared value instead of asking for a new one: retiring a decision does not
    change who made it.
  - `--decided-by` is rejected on every command that records no decision instead
    of being silently ignored, so a declaration cannot look recorded when the
    command had nowhere to put it.
  - Completion declares the value-taking options (`--tag`, `--tools`,
    `--workflows`, `--by`, `--reason`) as taking a value, so bash, zsh, and fish
    stop offering the option list where the CLI is waiting for a value; zsh also
    gains a fallback branch instead of silently completing nothing.
  - The installed skills tell agents how to declare: `human` when the person
    determined the direction, `agent` when the choice came from the agent's own
    judgment even if a person let it through, and to ask the person when they
    genuinely cannot tell.
  - The record-format reference in both languages, both READMEs, the CLI help and
    its required-option prompt, the generated repository README, the site copy,
    and the `decision-provenance` spec state the same boundary and its limits.
- bf66bb6: **BREAKING**: Remove the `--json` output mode from every command. `adrkit list`,
  `status`, `instructions`, `validate`, `config`, and `graph` now print text only,
  and `--json` is rejected as an unknown option.
  
  The mode was a template inheritance from the project's first commit, kept because
  the tool it was modeled on had one rather than because anything read it. The
  records are the interface: plain Markdown with YAML front matter that an agent
  reads directly, with `validate` as the machine check.
  
  - Deleting the flag also deletes `JSON_COMMANDS` and the hand-written "does not
    support `--json`" rejection, which existed only to police an option declared
    globally but implemented by a subset of commands.
  - `graph` keeps its three outputs: `--mermaid` (default), `--dot`, and `--text`.
  - `--help` and `--version` answer for themselves again. They are meta-flags
    rather than commands, so they print and exit 0 even beside another flag; only
    `--decided-by` on a real command is still rejected.

## 0.7.0

### Minor Changes

- 18e0bcb: Add `decided-by: human | machine` to the record front matter: the CLI infers
  it from the environment the recording command ran in, and it does not
  establish who chose or authorized the decision. No author name or account is
  recorded: git already owns identity, and an agent session commits as the
  human user.
  
  - `adrkit decide` and `adrkit accept` stamp the value from the environment the
    command runs in; a detected agent session yields `machine`, otherwise
    `human`. There is no flag to set it.
  - `adrkit propose` writes nothing, and a `decided-by` written into a draft is
    rejected while the draft exists and dropped when it is promoted.
  - `adrkit supersede` preserves the retiring record's value instead of
    re-stamping it: it describes the environment inferred when the decision was
    recorded, not the environment that ran the retirement.
  - `validate` requires the field on accepted and superseded records and rejects
    it on drafts. The field sits between `date` and `created` in canonical order.
  
  **Breaking for existing repositories:** accepted and superseded records
  recorded before this release carry no `decided-by` and fail `adrkit validate`
  until one is supplied. The CLI never writes it for them, because a machine
  inventing an origin for a past decision is exactly the fabricated history this
  field exists to prevent; supply the value you know to be true by hand, in the
  record. The record-format reference states plainly that the value is an
  inferred stamp, weaker evidence than `date` and `commit`, rather than proof,
  and names what defeats it.

### Patch Changes

- 5c1f720: Guide agents to add a task-start ADR reading rule to project instructions during setup. Before proposing or recording a decision, read existing decisions and check them against current code and requirements to avoid duplicate or conflicting records.
- 9270e9c: Guide agents to record only lasting architectural choices whose rationale is not apparent from code. Clarify that accepted records do not imply human review and that decided-by infers execution environment rather than authorization.

## 0.6.0

### Minor Changes

- 8533f4b: Remove the two forward-compatibility affordances the config and record
  rewriter carried for future versions that do not exist yet.
  
  - `AdrKitConfig` no longer exposes `raw`, the parsed `config.yaml` document
    kept "for forward compatibility". Nothing read it, and `adrkit config`
    never printed it. Dropping it also fixes a crash: an empty `config.yaml`
    made `map.toJSON()` return `null`, and the old `{ raw }` initialization
    then threw on the first property access.
  - `stampLifecycleMove` (used by `accept`, `reject`, and `supersede`) no longer
    copies front matter keys outside `FRONT_MATTER_ORDER` through a rewrite. A
    key this version does not understand is now dropped instead of written
    back, because silently carrying it forward hides a version mismatch rather
    than surfacing it. `adrkit validate` still reports unknown keys, so a
    record is corrected before any lifecycle move rewrites it.
  - No compatibility shim is provided: the project has no users yet.

## 0.5.0

### Minor Changes

- 1e60903: `adrkit init` and `adrkit update` accept `--workflows <list>` to install a
  subset of the workflow skills (for example `--workflows init,decide,validate`
  for a repository that only records decisions) instead of all seven. The subset
  is recorded in `adr/config.yaml`, survives a bare `adrkit update`, and
  `--workflows all` restores the full set. The `adr/README.md` template now
  documents the `created` and `tags` front-matter fields, matching the current
  record format.

## 0.4.0

### Minor Changes

- 03d4f83: Add `created` and `tags` to the record front matter. `created` is
  stamped once at record creation and never re-stamped, so the time axis
  survives later lifecycle moves (a superseded record keeps its birth date).
  `tags` is an optional kebab-case keyword list that lets `adrkit graph` group
  and filter decisions by theme. The graph now groups by `created`, tints
  Mermaid nodes by their first tag, adds `--tag <tag>` filtering, and a
  terminal-friendly `--text` tree output.

## 0.3.0

### Minor Changes

- 00c9e8a: Add `adrkit graph` — visualize the decision history of a repository
  from git commits and decision records, with status transitions and supersede
  relationships.
- 5593e76: `adrkit init` and `adrkit update` now write agent integration files to
  the standard `.agents/` directory by default; Claude Code is the only
  exception, generated via `adrkit update --tools claude` into `.claude/`.

## 0.2.7

### Patch Changes

- Fix Windows relative-path rendering in `adrkit show`, and retry `git rev-parse` once so a transient failure cannot silently drop the commit stamp.

## 0.2.6

### Patch Changes

- 4f8a5a4: Redesign the record model around durability. Decisions are durable records in
  `adr/decisions/`; proposals are ephemeral drafts in a gitignored
  `adr/.drafts/`. `adrkit accept` promotes a draft into a numbered decision and
  deletes it; `adrkit reject` discards a draft without leaving a record. The
  `rejected` status and the `proposed/`/`rejected/` folders are gone — rejection
  is recorded in a decision's `Alternatives considered`. `init` creates only
  `decisions/` (plus a `.gitignore` that keeps drafts out of git). `decide`,
  `accept`, and `supersede` stamp a `commit` field with the short HEAD hash when
  under git. `validate` checks durable decisions only; a draft is validated by
  `accept` right before it is promoted.
  
  Breaking: the three-folder layout and the `rejected` record state are removed.

## 0.2.5

### Patch Changes

- ac363ce: - Records now carry YAML front matter instead of `Status:`/`Date:` header
    lines. Status and date live only in the front matter (canonical field
    order `status`, `date`, `reason`, `superseded-by`); the `# ADR:` title
    stays as the H1 of the Markdown body. `reason` is required on rejected
    records and forbidden otherwise; `superseded-by` is required on
    superseded decisions and forbidden otherwise. Unknown front matter keys
    are preserved by lifecycle rewrites and reported by `validate`. This is
    a breaking format change: records written in the old header-line format
    no longer parse. The project has no released user base yet, so no
    migration path is provided. Updated the parser, validator, templates,
    commands, skills, docs, and test fixtures together.

## 0.2.4

### Patch Changes

- ef602d9: - Drop the stale "Open Architecture Decision Records" tagline left over from
    the pre-rename OpenADR era: the npm description, the `adrkit --help`
    header, and the README banner alt text now describe the project as
    "A lightweight ADR workflow for humans and agents" (the banner alt is
    simply "ADR Kit").
- 989b410: - Records now carry a `Date:` header line that records when the current
    status was reached. The CLI stamps it at every lifecycle move
    (`propose`, `decide`, `accept`, `reject`, `supersede`), so the date is
    machine-written and never drifts or goes stale. `validate` additionally
    checks the calendar validity of the date (for example `2026-02-31` is
    rejected). This is a format change: records without the `Date:` line no
    longer parse. The project has no released user base yet, so no migration
    path is provided.
- 989b410: - `adrkit accept` no longer drops extra proposal sections that have a place
    in an accepted decision — for example `## Implementation` holding a PR or
    review link. They are preserved verbatim, appended after the canonical
    `## Consequences` section, so a lifecycle move can never lose written
    content silently. Only proposal-era leftovers (`Plan`, `Migration plan`)
    are still dropped, and the existing warning still names them.

## 0.2.3

### Patch Changes

- b273373: - Decision numbers no longer use zero padding: the first decision is
    `1-use-sqlite.md` with `# ADR: 1 Use SQLite` (was `0001-...` / `# ADR:
    0001 ...`). Numbers grow naturally past 9999, and zero-padded titles or
    `superseded by` references are rejected. Updated the parser, validator,
    templates, command output, skills, docs, and test fixtures together.
- 54c7702: - `adrkit validate <name>` now checks that a `superseded by N` reference
    points at an existing decision that is not itself superseded; previously
    only a repository-wide `validate` caught dangling references.
  - Commands without JSON output now reject `--json` with an error instead of
    silently printing human-readable output.
  - `adrkit show <name>` and `adrkit validate <name>` now work when an
    unrelated record fails to parse; the corrupt file is still reported by a
    repository-wide `validate`.

## 0.2.2

### Patch Changes

- 217b895: - Fix the broken banner image on the npm package page: point the README
    image and every link (docs, skills, license, language switcher) at
    public GitHub URLs (`raw.githubusercontent.com` for the image, blob URLs
    for links), which render on both GitHub and the npm page now that the
    repository is public. npm does not serve package files, so relative
    README references stay broken there.
  - Replace em-dash separators in user-facing output (`adrkit instructions`
    readiness flags, `adrkit list` empty state), help text, docs, comments,
    and test fixtures with `-` or `:`.
- 92e3e2f: - Fix `adrkit --version` reporting a stale hardcoded version: the CLI now
    reads the version from package.json, which changesets bump on every
    release. `adrkit --version` / `adrkit version` will no longer lie about
    the installed package.
  - Synchronize the Chinese docs with the current behavior: the record-format
    status line now includes `superseded by NNNN`, the workflow docs cover
    superseding, and the `instructions` command description reflects the
    state-aware output. Normalize the `repository.url` to the `git+` form npm
    expects.

## 0.2.1

### Patch Changes

- 8461abc: - `adrkit instructions` now reports readiness per pending proposal: each
    proposal is flagged as validated (ready to accept) or needing work, and
    `--json` adds `readyToAccept` and `needsWork` next to `pending`. Pending
    proposals are no longer hidden by unrelated validation issues elsewhere in
    the repository.
  - Agent skills for propose/accept/supersede now instruct agents to re-query
    the repository state at decision points instead of trusting session
    memory.

## 0.2.0

### Minor Changes

- a2a541a: Added the `supersede` lifecycle command: `adrkit supersede <name> --by <name>`
  retires an accepted decision by rewriting its status line to
  `Status: superseded by NNNN`, keeping the record in `adr/decisions/` as
  history. `validate` now checks that superseded-by references exist and never
  point at another superseded decision, `status` counts superseded records
  separately, `list` annotates them, and an `adrkit-supersede` agent skill
  ships alongside the other command skills.

## 0.1.0

### Initial release

- `adrkit init` — initialize an `adr/` repository.
- `adrkit propose` / `adrkit decide` — create proposals or accepted decisions.
- `adrkit accept` / `adrkit reject` — move proposals through the lifecycle.
- `adrkit list` / `adrkit show` / `adrkit status` / `adrkit instructions`.
- `adrkit validate` — machine-checked ADR format and lifecycle rules.
