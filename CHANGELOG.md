# Changelog

## 0.2.0

### Minor Changes

- a2a541a: Added the `supersede` lifecycle command: `openadr supersede <name> --by <name>`
  retires an accepted decision by rewriting its status line to
  `Status: superseded by NNNN`, keeping the record in `adr/decisions/` as
  history. `validate` now checks that superseded-by references exist and never
  point at another superseded decision, `status` counts superseded records
  separately, `list` annotates them, and an `openadr-supersede` agent skill
  ships alongside the other command skills.

## 0.1.0

### Initial release

- `openadr init` — initialize an `adr/` repository.
- `openadr propose` / `openadr decide` — create proposals or accepted decisions.
- `openadr accept` / `openadr reject` — move proposals through the lifecycle.
- `openadr list` / `openadr show` / `openadr status` / `openadr instructions`.
- `openadr validate` — machine-checked ADR format and lifecycle rules.
