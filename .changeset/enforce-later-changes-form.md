---
'adr-kit': minor
---

`adrkit validate` enforces the `### Later changes` convention on implemented records: an amendment note left as trailing prose fails with a pointer to the subsection, and every subsection entry must open `**Amended by ADR N:**` with at least one entry present. Records written in the documented form pass unchanged; the numbers an entry cites were already checked as body references.
