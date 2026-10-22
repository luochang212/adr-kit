---
'adr-kit': minor
---

`adrkit validate` enforces the `### Later changes` convention on implemented records: a trailing-prose block that opens `ADR N later` fails with a pointer to the subsection, and an entry that starts like an amendment but loses its `**Amended by ADR N:**` opening fails too. An entry may continue over further paragraphs, and a plain continuation does not fail. At least one entry must be present; records written in the documented form pass unchanged. The numbers an entry cites were already checked as body references.
