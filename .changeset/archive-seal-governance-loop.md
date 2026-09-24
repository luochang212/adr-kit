---
"adr-kit": minor
---

Close the agent-note governance loop started by the four-stage lifecycle.
`adrkit init` writes a versioned `adr/archived/MANIFEST.json`, and
`adrkit archive` and `adrkit supersede` append a SHA-256 seal for the final
archived file; `adrkit validate` fails on unsealed, missing, malformed,
duplicate, or extra seals and on archived bytes that no longer match.
Repository-wide `adrkit validate --base <git-ref>` verifies the archive only
grew since that ref, refusing coordinated file-plus-hash edits; CI runs it
against the PR base or push head. The propose, record, grill, and implement
workflows now require a scoped supersession review and shipped-facts checks,
and a new focused `adrkit-review` workflow checks record-code coherence.
