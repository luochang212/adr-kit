# Changelog

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
