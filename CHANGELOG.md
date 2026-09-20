# Changelog

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
