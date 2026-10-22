---
'adr-kit': patch
---

`adrkit supersede` preserves the retiring record's `commit` instead of stamping the retirement commit. The field anchors a decision to the code state it was recorded against; `date` and Git history already carry the retirement state. The archived records that had been re-stamped are repaired to their birth values (ADR 17 and 19) or have the added stamp removed (ADR 27).
