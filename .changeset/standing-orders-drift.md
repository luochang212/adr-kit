---
"adr-kit": minor
---

Mark the standing-orders section with a content fingerprint and detect drift: `adrkit list`, `instructions`, `relevant`, `update`, and `init` print a note when AGENTS.md carries a section pasted from a different template (or before markers existed); the CLI never rewrites the file. `adrkit update` now reports `created`, `rewrote`, or `unchanged` per integration file instead of a blanket `created`. The READMEs document the breaking-upgrade contract and the `adr-kit` package name.
