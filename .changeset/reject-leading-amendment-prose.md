---
'adr-kit': patch
---

Reject unmarked prose before the first valid `### Later changes` entry. Previously, a later `**Amended by ADR N:**` entry caused the leading prose to pass as a continuation even though it had no preceding entry. The command regression test reproduces that false pass and verifies that paragraphs after a valid opening still pass. This is a local validation fix; no record-format migration is needed for records following the documented convention.
