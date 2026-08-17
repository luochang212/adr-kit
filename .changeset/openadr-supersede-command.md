---
"@luochang212/openadr": minor
---

Added the `supersede` lifecycle command: `openadr supersede <name> --by <name>`
retires an accepted decision by rewriting its status line to
`Status: superseded by NNNN`, keeping the record in `adr/decisions/` as
history. `validate` now checks that superseded-by references exist and never
point at another superseded decision, `status` counts superseded records
separately, `list` annotates them, and an `openadr-supersede` agent skill
ships alongside the other command skills.
