# Changelog

## 0.29.0

### Minor Changes

- fe8b6b0: Weight the random theme default toward Signal: omitting `--theme`, or passing `--theme random`, now rolls Folio 30% and Signal 70% once at generation (ADR 42). Refine the Signal archive desk with shuffled files, exhaustion reset, and a native modal left reader that keeps keyboard focus out of the background. Preserve Folio's first-screen layout, hide map legends on narrow screens, and display record and question numbers without leading zeros. Keep installed visualization guidance and templates in sync.

### Patch Changes

- c32f1c7: Give the Signal theme card its own voice in the gallery: the card title now uses the same monospace stack as the Signal atlas hero (weight 600) instead of a heavy generic sans, sized to keep the pair with Folio's italic serif balanced.
- 3a04a9b: Turn off the mobile browser's native tap highlight across the generated atlas, decision map and deliberation tree pages: tapping the archive desk files, map nodes and other full-bleed controls no longer flashes the whole element with the default translucent overlay on touch devices. Tap feedback comes from the page's own states.
- 4421052: Reserve the theme gallery screenshots' true aspect ratio: the published gallery reads each PNG's intrinsic size from its header and declares it as the image's width and height, so the preview cards no longer jump into place when the images decode on a phone.
- af9f29b: Make the Signal hero archive answer a buried file's click: it now tugs toward the exit and settles back into the stack instead of flashing a barely visible highlight, teaching that only the top sheet leaves the deck. Reduced motion keeps the opacity flash.

## 0.28.0

### Minor Changes

- 7fb3ac1: Ship two named full-atlas themes: Folio (warm paper/editorial) and Signal
  (dark/instrumental), with matching offline, bilingual map and reading features.
  Use `--theme folio|signal` to choose, or `--theme random` (also the default)
  to choose with equal probability once at generation. The HTML keeps that theme;
  there is no system appearance detection or page switch. Standalone maps and
  deliberation trees reject `--theme`.
  
  Refresh Folio’s responsive three-column directory and improve reader
  provenance/reference layouts in both themes. Both themes now keep the reader's
  source link in the sticky header: Folio styles it as a quiet padded control and
  Signal keeps its original text link. Preserve Signal’s original
  page styling and opening without hero actions. Fix range hover masking and interactive SVG semantics,
  and add browser accessibility and navigation regression checks. Lock the page's
  own scrollbar while the reader modal is open, so it no longer renders beside
  the reader's as a second, dead scrollbar on browsers with persistent
  scrollbars.

## 0.27.0

### Minor Changes

- c6f209d: Lifecycle moves close their gaps, and the CLI stops dropping positional arguments.
  
  - `implement` applies the same readiness gate as `validate <name>` and `instructions`: a proposal citing a missing decision is refused instead of being promoted into a record that fails validation on arrival.
  - `implement` and `reject` roll their staged file back when the proposal cannot be removed, the boundary `archive` and `supersede` already held: re-running the command can no longer allocate a second number for the same proposal.
  - `record`, `propose`, and `note` join unquoted shell words into one title or text instead of silently dropping every word after the first. Every other command now rejects extra positional arguments instead of ignoring them, `validate` rejects a record name combined with `--all`, and `list`, `status`, `instructions`, `config`, and `update` reject any positional argument. This is a breaking change for callers that passed stray arguments.
  - Section-heading comments retain their opening marker across body scans and promotion, so hidden text cannot satisfy required content or become visible after `implement`.
  - Body-reference mining (validation and the decision map) reads visible prose only: `ADR-N` mentions inside fenced code or HTML comments are no longer flagged as dangling references or drawn as edges.
  - `atlas --out` rejects an empty or directory target with a named remedy instead of a raw EISDIR error; `no ADR matches` names `adrkit list` as the next step; parseArgs errors print one line instead of a stack dump when `dist/cli.js` is run directly.
  - The shipped decision-atlas template is held byte-equal to the shared canvas constants by a mirror test, guards its empty-canvas initial view, and the English page no longer emits full-width commas in runtime-joined labels.
  - CI installs zsh and fish so the real-shell completion tests run there, and the release workflow runs the suite before publishing. `SECURITY.md` now states the pre-stable support policy instead of a 0.1.x table.

### Patch Changes

- e19451d: The package name becomes discoverable from the command name, so users who only know `adrkit` can find the package on npm.
  
  - The package lists `adrkit` as a keyword, so `npm search adrkit` now returns `adr-kit`; previously that search returned only other projects' packages and none of ours.
  - `adrkit --help` names the npm package in its header line.
  - The standing-orders template (generation `b82e4add`, up from `449bd66b`) tells agents the npm package is `adr-kit` and the command it installs is `adrkit`, so install and upgrade with `npm install -g adr-kit`; existing AGENTS.md sections receive the template-change note on the next `adrkit` command and reconcile.
  - The READMEs, the site homepage in both languages, and `docs/cli.md` state the package and command distinction next to the install instructions.

## 0.26.0

### Minor Changes

- 7479bf2: Breaking: visualization formats no longer select the generated object. `adrkit atlas --format html --out adr.html` now writes the full decision atlas. Standalone maps require `--map`, for example `adrkit atlas --map --out map.html` or `adrkit atlas --map --format mermaid`. Non-HTML formats without an explicit map or record are rejected with a corrective hint. Map filters require `--map`; single-record trees now also default to HTML and accept `--format html|mermaid|text`. The `--diagram` flag is removed. Atlas rejects positional arguments and points record queries to `--record <name>`. File-output receipts now identify the object, format, and absolute path; stdout without `--out` remains the artifact alone. Refresh agent integrations with `adrkit update` after upgrading.
- 340fa48: Make standing-orders generation tracking optional: unmarked AGENTS.md sections no longer produce drift notes. A marker declares reconciliation with a template generation, allowing translation and local edits without asserting body equality. Old markers ask users to compare and reconcile changes before updating the marker; init/update still report missing sections and never rewrite AGENTS.md.

### Patch Changes

- 2671842: Stop restarting chapter-navigation smooth scrolling on every page scroll update. Bring a chapter into view only when it becomes active and is outside the navigation viewport; honor reduced-motion preferences. This removes redundant motion in narrow decision-atlas navigation without changing page-scroll or canvas gestures.
- 2671842: Hide HTML comments in decision-atlas details, including template guidance after lists, multiline comments, and unfinished comments. Preserve visible surrounding text and comment examples in code. The shared template updates CLI atlases, installed visualization resources, and both site languages.
- 2671842: Render Markdown task lists in decision-atlas details as disabled native checkboxes, including checked and unchecked items, uppercase X, and ordered lists. Preserve continuation text and inline code/emphasis. The shared template fixes CLI atlases and both site languages without adding dependencies.
- cad88d2: Balance the decision atlas's reference and replacement summaries towards a shared preferred height of 26rem, with a hard maximum of 35rem and no forced minimum. Select whole rows by their rendered heights on desktop and mobile, recalculating only when width or fonts change. Center the density chart's counts above their bars. The shared template applies to CLI exports and both website languages.
- 40cda8d: Shorten both decision-atlas footers to the generator attribution and pinned commit. Remove project-home and language-switch footer links, and omit the redundant current-records wording. Both language pages remain generated and published.
- 2671842: Right-align the decision-atlas chapter links on mobile and remove the right-side fade that obscured the last link. Preserve horizontal scrolling on narrow screens. Canvas window-resize events now preserve zoom and pan instead of automatically refitting; initial views and explicit Fit/Reset controls remain available in the atlas and standalone visualizations.
- 2755f6d: Raise the decision atlas's shared insight height budget from a 26rem preference and 35rem maximum to 40rem and 50rem, so the replacement panel shows at least three rows and the reference panel sits slightly shorter. Drop the map legend's active-records note.

## 0.25.0

### Minor Changes

- 09a43d9: Add `adrkit hook <install|uninstall|run>`: an opt-in pre-commit check that fails on staged records or `@adr` citations that are objectively invalid, then reports which active decisions govern the staged files and asks the committer to record or park a choice the change settles. It never fails on "no record was written" — a hook cannot observe whether a choice was settled, so that judgment stays with the committer. `install` refuses to replace a hook adr-kit does not manage; `uninstall` leaves one untouched. The installed hook changes into the ADR root before it runs, so `adr/` may sit below the repository root.
  
  This also closes ADR 17's deferred task-end self-check instead of shipping it (ADR 32): its evidence came from one spec framework's archive step, and the commit boundary is the better check-in point. No task-end sentence is added to the standing orders.
- 4d95d8d: The decision atlas now renders in English by default and in Chinese with `--lang zh`; the generator translates the shipped template's chrome and builds the hero, statistics, notes, footer, and title in the chosen language, so one frontend serves both. `--lang` applies to the atlas page only; `--record` and `--format` reject it instead of ignoring it. The site build pins its own Chinese copy.
- ec3eeb9: Replace `adrkit graph` and `adrkit tree` with one visualization command, `adrkit atlas` (ADR 33). With no flags it writes the decision atlas — the default answer to an unqualified visualization request. `--record <name> --diagram` renders one decision's deliberation card tree, `--format mermaid|dot|text` exports the relationship map's source (`--tag` and `--formal-only` still filter it), `--format html` emits the standalone map page with its output-path link resolution, and `--out` writes any mode. A nested `adr/` root names the page after the repository folder, not the subdirectory that holds the records. `graph` and `tree` are rejected as unknown commands; scripts must use the new modes. The README upgrade section names the replacements.
- 309204c: `adrkit validate` enforces the `### Later changes` convention on implemented records: a trailing-prose block that opens `ADR N later` fails with a pointer to the subsection, and an entry that starts like an amendment but loses its `**Amended by ADR N:**` opening fails too. An entry may continue over further paragraphs, and a plain continuation does not fail. At least one entry must be present; records written in the documented form pass unchanged. The numbers an entry cites were already checked as body references.
- 9750ea8: The site build publishes the decision atlas in Chinese and English from the same records (`index.html` and `en.html`), each footer linking its sibling through the new `langHref` option on `renderDecisionAtlas`, and each homepage language linking its own page. One template and the translation table remain the only carriers; nothing is hand-localized.

### Patch Changes

- ec3eeb9: Every generated page (atlas, map, card tree) carries the project mark as an inline favicon, and the canvas dock anchors to the viewport so a deep link no longer drags it into the middle of the canvas. The three product terms are unified as decision atlas, decision map, and deliberation tree across the CLI, docs, skills, and site copy.
- 09a43d9: Tell the init workflow how to choose record language: match the language of existing records, use the user's language only in a repository with no records yet, and keep that one language for titles and bodies instead of switching per conversation. Existing repositories give the agent the convention by reading their records, so no other surface carries the rule.
- 09a43d9: Carry the review method in the `adrkit-review` skill: reproduce a finding against the real code path before calling it confirmed, leave the failing scenario as an assertion under `test/`, and treat a failed reproduction as a narrowed claim rather than proof of absence. A confirmed defect is not yet a fix — weigh trigger probability, blast radius, fix cost, and the cost of leaving it, and state plainly a true finding left unfixed. The standing orders add one clause: when an active record's mechanism is itself unsound, weigh removing it rather than patching it.
- 5d83878: The installed pre-commit hook fails closed with a message naming the remedy when the CLI entry it pins is gone — reinstall with `adrkit hook install`, remove the hook with `adrkit hook uninstall`, or bypass once with `git commit --no-verify` — instead of surfacing a bare Node module-loader error.
- f9fb810: The atlas hero lead states the page's refresh contract — records are re-read at every site build, no manual snapshot — in both languages, instead of repeating the generator attribution that the footer already carries.
- 79bfc0c: Validation reports now speak the repository's forward-slash path convention on Windows too: `formatIssues` normalizes the platform separators that issue paths pick up from `node:path` math, so a pre-commit hook failure on Windows reads `adr/implemented/1-test.md` instead of `adr\implemented\1-test.md`. The hook also hands the parser absolute paths again, as `validateRecord`'s relative-path math expects.
- d0eef06: The decision atlas's stat numerals track the page hierarchy again. The template shipped with an unconditional `font-size: 24px` override sitting on top of an unreachable `clamp(36px, 4.5vw, 52px)` rule, pinning the numbers at 24px on every screen; the override is gone and the clamp is rescaled to `clamp(28px, 3.5vw, 44px)` so the numerals stay below the hero title and section headings. Phones keep their pinned size.
- de5f214: The decision atlas footer names `adr-kit` as a link to the tool's repository; the commit link beside it still points at the repository being documented. The previous link resolved against the documented repository, which only looked right when the tool documented itself.
- 835e327: `adrkit supersede` preserves the retiring record's `commit` instead of stamping the retirement commit. The field anchors a decision to the code state it was recorded against; `date` and Git history already carry the retirement state. The archived records that had been re-stamped are repaired to their birth values (ADR 17 and 19) or have the added stamp removed (ADR 27).
- 09a43d9: Publish archived record bodies in the decision atlas. The payload and the archive-page example reader render archived bodies in full instead of a metadata-only notice, keeping the archived/current distinction visible through the status chip and card styling; the `adrkit-visualize` skill, the standing orders, and both READMEs now instruct generation to publish archived bodies in full. Agents' default reading posture for `archived/` is unchanged (ADR 31).
- 8a41c6b: Reject unmarked prose before the first valid `### Later changes` entry. Previously, a later `**Amended by ADR N:**` entry caused the leading prose to pass as a continuation even though it had no preceding entry. The command regression test reproduces that false pass and verifies that paragraphs after a valid opening still pass. This is a local validation fix; no record-format migration is needed for records following the documented convention.
- c301e71: The atlas's replacements note reads naturally again: when every archived record names a successor it says so directly ("replaced choices do not disappear… each pointing to its successor") instead of "5 archived records, of which 5…", and the two counts appear only when they differ. Both languages.

## 0.24.0

### Minor Changes

- 38a658d: Raise the supported Node.js floor to 22.22. Node 20 is end-of-life, and the test and site toolchains already require 22.12 and 22.22; the runtime declaration now matches what CI verifies.
- 4d0504f: Remove the archive seal and manifest. `archived/` is ordinary Git-tracked history, validated by the current format; `archive` and `supersede` just move the record. `adrkit validate --base` is removed, and an existing `adr/archived/MANIFEST.json` is no longer read.

### Patch Changes

- cd847de: Improve the archive-page example's range rail, mark its replaceable regions so a generated atlas and the installed resource stay one frontend, and route history-sharing requests to the visualization skill from the standing orders.
- 7679402: Widen the archive-page reader to a capped 45% and render ordered lists, italics, code nested inside bold, and a source link in the atlas adapter contract; keep the fixed close tab aligned with the drawer.
- 6d00f6b: Reflow hard-wrapped prose and keep wrapped list items inside their bullets in the archive-page reader, so the record body is readable at any panel width.
- 51cb9c6: Render record H3 subheadings instead of literal hash marks and use pretty text wrapping for reader prose and lists.

## 0.23.0

### Minor Changes

- a2c30d1: Add an optional offline archive-page example to the visualization skill, with guidance for adapting its layout to the repository's size and the user's question, plus a concrete build recipe for regenerating a repository's atlas from it (records extraction, graph SVG splice, computed section notes, commit-pinned footer). Install, refresh, and remove the example with its selected workflow; keep the existing graph and tree outputs as the defaults.
  
  Determine lifecycle from the record's directory: ordinary archives retain `status: implemented` but are no longer current authority. Archive cards show the archive reason when no successor exists instead of claiming replacement by an undefined decision.

## 0.22.0

### Minor Changes

- ab3ecaa: Protect numbered writes with an exclusive per-number lock and check both `implemented/` and `archived/` before writing. Concurrent `adrkit record`/`adrkit implement` writers fail with a retryable error instead of creating duplicate numbers, and new implemented records cannot overwrite the same filename. Archive staging retains its same-name write behavior. Document interrupted-lock recovery and the scope of this protection. The bilingual READMEs and CLI reference now describe validation coverage, including single-record reference and seal checks.
- 74cb6df: Mark the standing-orders section with a content fingerprint and detect drift: `adrkit list`, `instructions`, `relevant`, `update`, and `init` print a note when AGENTS.md carries a section pasted from a different template (or before markers existed); the CLI never rewrites the file. `adrkit update` now reports `created`, `rewrote`, or `unchanged` per integration file instead of a blanket `created`. The READMEs document the breaking-upgrade contract and the `adr-kit` package name.

### Patch Changes

- 88129c1: Preserve existing archive seals on partial manifest writes and reject special-file manifests before reading. Share comment/fence-aware record scanning, validate generated decisions before promotion removes proposals, append concurrent notes without replacing another writer's content, report citation scan failures, and display repository issues alongside pending proposals. Accept filename-prefix scope globs and include symlink paths as directory-query leaves. Correct bilingual validation coverage and defer full supersession until a replacement has shipped.

## 0.21.0

### Minor Changes

- 3334592: Add `@adr <number>` citations in code and configuration files. `adrkit validate` now fails when a citation names a missing, archived, or superseded decision (naming the successor), or when the citing file sits outside that decision's `paths`. Citations are optional; Markdown and the root `site/` documentation copy are not scanned.

## 0.20.0

### Minor Changes

- 847dc5e: Reject records outside the four lifecycle folders. Repository validation now fails an unknown folder under `adr/`, a record at the `adr/` root, and a nested folder inside `proposed/`, `implemented/`, `rejected/`, or `archived/`, so a misplaced record cannot disappear from `list` and `relevant`. Section parsing also ignores `##` headings inside fenced code blocks, so a documented example no longer becomes a duplicate section and fails validation for the wrong reason.
- 847dc5e: Promote a proposal's acceptance criteria and risks into present-tense `### Verification` and `### Trade-offs` under `## Consequences` instead of the proposal-era `### Acceptance criteria` and `### Risks`; `adrkit implement` now warns that the folded content must be rewritten in the present tense. `adrkit validate` rejects the two old H3 names directly under Consequences in implemented records, while ignoring other sections, fenced code, HTML comments, proposals, rejections, and archived records. The five records carrying the old shape migrate in the same change. Existing records with the old shape fail validation; by decision, no compatibility path is carried — the real user is currently the maintainer, who renames the headings on upgrade.

## 0.19.1

### Patch Changes

- fd398af: Explain the cost of keeping records in the guidance installed by `adrkit init` and `adrkit update`. The standing orders, both READMEs, and the workflow guides now state that records cost time to write, read, and maintain, so routine fixes and local renames usually need none when code and tests already explain them. No runtime behavior change.

## 0.19.0

### Minor Changes

- 65abb31: Carry standing orders in AGENTS.md only: Claude Code reads AGENTS.md natively since v2.1.277 and no other tool reads CLAUDE.md, so the init workflow pastes into AGENTS.md alone and the missing-section note no longer counts a CLAUDE.md carrier (ADR 24). Standing-orders detection gains a language-neutral anchor — the task-start `adrkit list` command survives translation, so a fully localized section no longer trips the note. `adrkit show` sizes its underline by East Asian display width and resolves a numbered record by its number-stripped title, the form `adrkit list` prints and prose quotes. `adrkit propose` and `adrkit record` print a one-time `paths:` scoping tip, and fresh drafts state the pointer rule: volatile facts belong to an owner next to the code, not in the record.

## 0.18.1

### Patch Changes

- aaeaf66: Canonicalize the Git toplevel and the ADR root through the native realpath before scope filtering, so Git-based retrieval still reports changed paths on Windows where the temp directory reaches Node and git under different spellings (8.3 short names).

## 0.18.0

### Minor Changes

- fc476fe: Retrieve scoped decisions from an exact Git base or staged changes, preserve deleted and renamed paths, and report incomplete directory searches and unscoped coverage. Strengthen installed authoring and review skills with source anchors, explicit unknowns, and planned-to-actual change context.

## 0.17.0

### Minor Changes

- c2e1b17: Scope records to file paths: a new optional `paths:` front matter field (repo-relative globs; `**` crosses separators, `*` stays in a segment, `?` matches one character) turns each record into a retrievable scope, and `adrkit relevant <path>...` retrieves the records whose scopes govern a file or directory, grouped by reading posture so agents read the governing implemented records in full and proposed and rejected ones with the right caution.
  
  `adrkit validate` now fails a `paths:` entry whose static prefix no longer exists on disk, catching scope drift the moment a file moves or a path is typoed — except on archived records, whose sealed bytes must not depend on the live tree. The field and the command are mirrored through both READMEs, the record-format and CLI references, the workflow guides, the standing orders in the agent integrations, and the `adrkit-init` and `adrkit-review` skill mirrors.

## 0.16.0

### Minor Changes

- a3072af: Give the settle moment a one-line legal action: `adrkit note "<text>"` appends a timestamped line to `adr/notes.md`.
  
  The buffer is a plain file outside the lifecycle — no front matter, no template, no number — and `adrkit validate` ignores it: capture and shape stay separate, so the record format keeps its validation-failures-are-success-signals contract while the spontaneous moment stops paying the five-section detour. `adrkit list` and `adrkit instructions` surface an "N unshaped notes" count so shaping becomes visible debt; the `adrkit-propose` and `adrkit-grill` skills read the buffer as candidate material, and a new `adrkit-note` skill mirrors the settle moment the way the capture-side descriptions do. Shell completion, the help synopsis, and the bilingual CLI reference document the new command.

### Patch Changes

- 21bed9e: Bind adr/'s purpose to every agent-facing surface and mirror the settle moment in capture-side skill descriptions.
  
  The standing orders, the generated `adr/README.md`, `adrkit instructions` output, and each workflow skill now open with one line stating the failure modes adr/ exists to block (mid-task drift from long-term decisions, forgetting settled choices), so agents learn the why along with the obligations. The `adrkit-propose`, `adrkit-record`, and `adrkit-grill` descriptions are rewritten in situational language because descriptions are the retrieval key in skill-based agents: they must mirror the moment ("catch yourself settling a choice future work must live with"), not the tool's category. The purpose sentence is shared between the template and the dogfooded AGENTS.md, machine-checked by a new test.

## 0.15.0

### Minor Changes

- 5244e7a: Report invalid types in known configuration fields during repository validation. Explain partial completion and recovery when archive or supersede seals a record but cannot remove its active source. Removing the active source is idempotent: a record that is already gone counts as a completed move, so the partial-completion diagnostic appears only when removal actually fails.
  
  Repositories that leave a known field empty (`tools:`, `rules:`) or mistyped now fail `adrkit validate --all` until the field is corrected or removed; previously the invalid value was silently ignored.

### Patch Changes

- Unify the offline HTML canvas. The decision map now draws the same dotted ground as the deliberation card tree and the exported image, the floating legend and zoom controls are frosted over it, and the Fit control is an icon whose label survives as its accessible name and hover title.
- Refresh the guidance installed by `adrkit init` and `adrkit update`. An ADR is now admitted only when its lasting rationale or genuine trade-offs are not already explained by code, tests, and existing documentation — a behavior change alone does not qualify — and the grilling method words each question so answering "yes" accepts the recommendation.

## 0.14.1

### Patch Changes

- 0afa477: Harden base-aware validation and refresh the generated guidance.
  
  - `adrkit validate --base <git-ref>` now fails when the base ref carries no
    readable `adr/archived/MANIFEST.json`, instead of treating it as having no
    prior seals.
  - A project `context` in `adr/config.yaml` that starts with an HTML comment is
    now injected into new templates instead of being skipped.
  - The generated `adr/README.md`, the standing-orders guidance, and the installed
    skills now describe the four lifecycle folders as a context budget and
    `rejected/` as durable anti-pattern memory.

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
