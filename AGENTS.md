# AGENTS.md

ADR Kit is a command-line tool for Architecture Decision Records. This file
contains standing orders for coding agents working in this repository.

## Reading architecture decisions

`adr/` exists because agents over-focus on the current task and forget settled decisions: reading it at task start counters the drift, and preserving important context before it is lost counters the forgetting. At the start of a coding, design, or review task, if `adr/` exists, run
`adrkit list` to discover the inventory. The four lifecycle folders are a
context budget: read the relevant `implemented/` records in full with
`adrkit show <N>` or their files; check the relevant `proposed/` records for
intent and the relevant `rejected/` records for the bad cases they warn
against (a rejection is durable: it leaves only when another record owns its
warning); treat `archived/` as frozen history and read it only when a task
explicitly cites it. Do not judge relevance by title alone; inspect descriptions,
paths, relationships, and task scope; when a task targets specific files,
`adrkit relevant <path>` retrieves the records whose `paths:` scopes govern
them. For actual Git changes, use `adrkit relevant --base <review-base>` or
`adrkit relevant --staged`; supplement scope matches with inventory reading for
unscoped decisions and resolve incomplete-search diagnostics. Check relevant decisions against
current code and requirements. Apply constraints that still hold; explain
conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.

A `## Deliberation` appendix records the design tree behind a decision. It is
reference material: read it only when that decision is in play, not on every
task.

Before creating any record, compare it with the active records covering the
same choice or mechanism: extend a duplicate; when the active record's
mechanism is itself unsound, weigh removing it rather than patching it; for an
unshipped full replacement, link its intent and keep the old authority active,
then use `adrkit supersede --by` in the same change that ships and records the
replacement; link a partial overlap while the older record stays active. When
shipping or reviewing, keep the realization facts an active record actually claims aligned with
shipped code; a changed recorded choice is a new record
with an explicit relationship, not a rewrite of old rationale. Archived records
are ordinary Git-tracked history, never edited silently; `adrkit validate`
checks them like any record.

ADR Kit is the agent's notebook, not a change log. Record an ADR when an
architectural choice carries important information that code, tests, and
existing documentation cannot reliably preserve. Weigh importance, impact
breadth, longevity, resistance to becoming stale, and how hidden the constraint
or rationale is, especially when it exists only in a user conversation. These
are judgment dimensions, not a score or five mandatory conditions. Ask what
would be lost, what forgetting would cost, and what stable choice and reason
should survive. Routine upgrades and visual adjustments usually belong to Git,
configuration, styles, or tests; a hidden offline-deployment or accessibility
constraint may merit a record. Preserve genuine reasons and alternatives, not
invented template filler. Skipping a record is valid; no declaration or user
approval is required for each skip. Respect explicit user requests to preserve a
choice without extending them to all similar edits.

An existing record is not precedent for recording similar edits. Changes within
its implementation freedom need no ADR update unless a claim it actually makes
becomes false; keep required paths and references valid. If volatile details
force repeated synchronization, report the burden and suggest trimming details
to their existing owner or authorized archival. Do not silently rewrite a
choice, ignore an explicit constraint, delete records, or archive them without
authorization. Grilling uses the same selection judgment: discussion alone does
not require a record. Preserve the complete tree with a qualifying record; if
none qualifies, summarize in conversation and create none. Use `adrkit propose`
for unshipped work, `adrkit implement` after it ships, and `adrkit record` for
an already-shipped decision. `decided-by` is a declaration of where the choice
came from, not an inference: `human` when a person determined the direction —
they stated it, changed a proposal into what shipped, or you are recording one
they made earlier — `agent` when it came from the agent's own judgment,
including when a person only let it through. The CLI neither infers nor verifies
it.

Records outlive the format that wrote them. The npm package is
`adr-kit`; the command it installs is `adrkit`, so install and upgrade
with `npm install -g adr-kit`. The former `tags` field is removed: remove it and author a one-sentence
`description` explaining when to read each record; labels cannot mechanically
supply that sentence. When `adrkit validate` reports
unknown fields, missing sections, or parse errors on records an older release
wrote, treat it as format drift rather than damage: upgrade the `adr-kit`
package to the latest stable release, migrate the active records to the current
format where the change is mechanical, and report any record that cannot be
carried over instead of forcing a rewrite; then re-run `adrkit validate --all`.
Archived records are ordinary Git-tracked history: validate checks them by the
current rules; a later format change is a normal migration commit.

When the user wants to review or share the project's history, use the
`adrkit-visualize` skill; generate a browsable atlas from `adr/implemented/`
and `adr/archived/` only, publish archived bodies in full, and pin the page to
the commit it was built from.

<!-- adrkit: standing-orders 2cde6e1f -->

## Commands

```sh
npm install
npm run typecheck
npm test
npm run build
npm run check:upstream   # fails if the pinned upstream grilling directory drifted
```

Run the smallest check that covers the changed surface. `npm test` is the
fast unit gate; CI also runs `npm run build` and `npm run typecheck`.

## Concurrent agents

This repository may be edited by more than one agent at a time. Keep writes
single-writer: before any `git reset`, `rebase`, `checkout`, or `commit`, run
`git status` and `git log origin/main..HEAD` and confirm no other agent has work
in the tree or unpushed commits. When two agents must work together, give each a
separate branch (or checkout) and merge through review instead of both
committing to `main`; an agent that only needs to propose a change should hand
over a patch rather than share the working tree.

## Conventions

- The runtime CLI lives in `src/cli.ts` and the command implementations in
  `src/commands/`. Core logic (parsing, validation, repository handling,
  tool integrations) lives in `src/core/` and must stay independent of
  `console` and `process.argv` so it remains testable.
- Agent integration files are generated by `adrkit init` (standard
  `.agents/` target by default) and `adrkit update` (`--tools claude` adds
  the `.claude/` exception for Claude Code). The templates live in
  `src/core/tool-integrations.ts`, the only editing source for workflow text
  and descriptions. `npm run build` exports `skills/<name>/SKILL.md` for GitHub
  distribution; commit those generated files with the source change. Do not
  edit their Markdown directly. `test/integrations.test.ts` detects stale
  exports. Supporting resources such as the atlas HTML remain authored files.
- The standing-orders marker declares reconciliation with a template generation,
  not body equality. Local edits and translation are allowed. Compare and
  reconcile changes before updating the marker; omitting it opts out of
  template-change notes. Preserve the user-owned AGENTS.md boundary: CLI
  commands read it but never rewrite it.
- The `adrkit-grill` method is adapted from `mattpocock/skills` (MIT). The
  upstream grilling directory is vendored under `assets/upstream/grilling/`
  and pinned in `MANIFEST.json`; CI hard-fails (`npm run check:upstream`) when
  it drifts. Review with `npm run grilling:diff`, then update the adaptation and
  the pin by hand — never auto-sync it.
- The CLI surface lives in `src/core/cli-options.ts`: `COMMANDS` lists the
  commands and `OPTION_SPECS` declares every option, deriving the parseArgs
  declaration, the per-command rejection check, and the shell completion. Add a
  command or option there, spell it in the `HELP` synopsis in `src/cli.ts`
  (`test/cli.test.ts` holds each command's synopsis to the table), and document
  it in `docs/cli.md`; keep `src/commands/completion.ts` for the per-shell
  rendering.
- Visualization object selection is explicit: `adrkit atlas` and
  `adrkit atlas --format html` generate the full atlas. Use `--map` for the
  decision map, including source exports; `--format` never selects an object.
  All three objects default to HTML; `--record <name>` selects a record's
  deliberation tree and `--format` sets its encoding. The old `--diagram` flag
  is removed. Reject positional arguments rather than silently ignoring them.
  Old map export commands must add `--map`.
- Code and configuration may cite the decision they follow with `@adr N`
  (`@adr 14, 22`). `adrkit validate` fails when a citation names a missing,
  archived, or superseded decision, or a file outside that decision's `paths`.
  Markdown and the root `site/` documentation copy are not scanned, and citations
  are optional.
- Record files are YAML front matter plus a Markdown body. The parser and
  validator are the format contract; status and date live only in the
  front matter, never repeated in the body. Do not introduce a second
  format without changing `src/core/adr.ts`, `src/core/validate.ts`, the
  templates, and the README in the same change.
- `parseArgs` from `node:util` is the CLI parser. Do not add a CLI
  dependency for argument parsing.
- `yaml` is the only runtime dependency. Keep it that way unless a change
  is irreducibly dependency-shaped.
- Every behavior change gets a test in `test/`. Command tests create real
  repositories in a temp directory and assert on files and command output.
- `openspec/` is frozen history, not a second spec system: the current rules
  live in `adr/` and `docs/`. `openspec/specs/` predates ADR 30, 33, and 36 and
  must not drive implementation; `openspec/changes/archive/` is retained only
  because records cite it as deliberation evidence.
- Design for the future, not for compatibility: ADR Kit is pre-stable and ships
  breaking changes deliberately — forward-compatibility shims, deprecation
  windows, grandfather markers, and migration commands are not carried, and no
  release promises that old records or integrations keep working. External
  adopters exist, so a break is a user-facing decision: say so where users meet
  it (the record format, the README stability note and the upgrade guide, the
  standing orders),
  migrate active records where the change is mechanical, state plainly when a
  record cannot be carried over, and never rewrite archived records silently
  (ADR 30).

## Project website

The homepage's default entry selects language from an explicit `?lang=en|zh`
switch, then the saved `adr-kit.language` preference, then the browser's
language list (any Chinese entry means Chinese, ADR 38; otherwise English). A
direct `/zh/` link stays Chinese. Keep the switch usable when local storage is
unavailable.

`site/` is the bilingual (en/zh) project homepage, an Astro app deployed to
GitHub Pages by `.github/workflows/site.yml`. It has its own
`package.json` and build (`cd site && npm run build`), which regenerates the
atlas through the compiled CLI and therefore needs the root `npm run build`
first. Copy lives in `site/src/i18n/ui.ts`: edit both languages in
the same change. The integration story in that table (`faq.1.a`:
default `.agents/` target plus the
Claude Code exception) mirrors the targets in `src/core/tool-integrations.ts`;
update both when they change. The terminal demo transcript in
`site/src/components/TerminalDemo.astro` and the graph example in
`site/src/components/Graph.astro` mirror real CLI output; refresh them
when command output changes. `tools/build-decision-atlas.mjs` regenerates
`site/public/decisions/` from the current `adr/` records before every site build.
`SITE_PAGES` in that script publishes both themes in both languages: Folio at
`folio.html` / `folio.en.html`, Signal at `signal.html` / `signal.en.html`.
`SITE_PREVIEW_PAGES` adds the theme gallery at `index.html` / `en.html`. These pages
are generated and ignored by Git; the four atlas pages are pinned to the build commit. The build writes
all six before removing obsolete generated HTML. The four atlases share one template and
translation table (ADR 34), so they stay outside the `ui.ts` copy rule. The
homepage's atlas link lives in `Graph.astro` and opens Signal in the current language;
each README keeps the theme gallery entry and both named previews in its own language.
Both themes follow
`docs/atlas-themes.md`: behavior is shared and presentation is separate. Theme
changes must keep the common browser gate passing in both themes and languages,
including unavailable-module activation and insight height budgets; the gate
checks the published routes and isolated fixtures from the same records. Agents default to random for a new atlas without a clear
preference and preserve the selected theme when updating an existing artifact
unless asked to change it. The browser gate runs on Linux CI and on macOS and
Windows locally, where font metrics differ: express a layout budget in the
page's own units — rem, or a measured row height — rather than as a pixel gap
between two elements, and match a negative assertion to the control's own
wording rather than to any element whose text mentions the feature.

## Record format is the product

Every required section needs written content outside HTML comments and fenced
examples, including decisions' `Consequences` and proposals' `Acceptance
criteria` and `Risks`. Older empty sections need author input, not placeholder
prose; report missing substance that cannot be mechanically migrated. Rejection
requires the problem, proposal, alternatives, and a reason, without completing
an abandoned implementation plan.

The front matter layout (`---`, `status`/`date` fields in canonical
order, `---`, blank line, `# ADR:` title) and the per-status section
skeletons are machine-checked. The `date` field is machine-stamped at
every lifecycle move. When you change a template or a validation rule,
update:

- `src/core/adr.ts` (parser and `FRONT_MATTER_ORDER`)
- `src/core/templates.ts`
- `src/core/validate.ts`
- `README.md` and `README.zh.md`
- `docs/record-format.md` and `docs/zh/record-format.md`
- at least one test in `test/commands.test.ts`

## Validation failures are success signals

`adrkit validate` is supposed to fail on fresh proposals until humans or
agents fill in the required sections. Tests must prove both sides: valid
records pass, and incomplete records fail for the exact missing requirement.
