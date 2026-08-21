# Changelog

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
