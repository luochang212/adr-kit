# Changelog

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
