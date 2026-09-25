---
'adr-kit': minor
---

Seal archived records and govern the lifecycle loop. `adrkit init` writes
`adr/archived/MANIFEST.json`; `archive` and `supersede` append a SHA-256 seal,
`validate` checks it, and `validate --base <git-ref>` proves the archive only
grows. The installed skills now require a scoped supersession check when
creating a record and shipped-fact checks on delivery, with a new
`adrkit-review` workflow.
