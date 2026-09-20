---
"adr-kit": patch
---

`adrkit validate` now reports a record body that references a decision number
which does not exist (`ADR-N` / `ADR N`). Previously such a reference was
silently dropped by `adrkit graph` and never failed validation, leaving a dead
cross-reference in an immutable record.
