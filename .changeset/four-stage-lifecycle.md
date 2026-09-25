---
'adr-kit': minor
---

Organize records by lifecycle. Records now live in `adr/proposed/`,
`adr/implemented/`, `adr/rejected/`, and `adr/archived/`; `adrkit accept`
becomes `adrkit implement` and `adrkit decide` becomes `adrkit record`, and
the old `adr/decisions/` and `.drafts/` layouts are gone. This is a breaking
rename for a pre-1.0 package, shipped as a minor bump with no migration layer.
