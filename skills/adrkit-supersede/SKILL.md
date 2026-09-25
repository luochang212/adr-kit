---
name: adrkit-supersede
description: Use when one implemented decision fully replaces another and the old record must become archived history.
---

# ADR Kit Supersede

First record or implement the replacement and validate it. Confirm it fully replaces the old decision; partial overlap calls for prose links while the old record remains active. Run `adrkit supersede <old> --by <new>`. Both records must be implemented; the command stamps `superseded-by`, moves the old numbered file into `archived/` (lowest-value frozen history), preserves its provenance and number, and seals the archived file in `adr/archived/MANIFEST.json`. Run `adrkit validate` to check the chain and the new seal. Do not edit the archived choice or rationale afterward.
