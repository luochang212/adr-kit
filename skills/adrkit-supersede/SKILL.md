---
name: adrkit-supersede
description: Use when one implemented decision fully replaces another and the old record must become archived history.
---

# ADR Kit Supersede

Supersession turns a changed decision into an explicit handover instead of a silent contradiction between old and new guidance.

First record or implement the replacement and validate it. Confirm it fully replaces the old decision; partial overlap calls for prose links while the old record remains active. Run `adrkit supersede <old> --by <new>`. Both records must be implemented; the command stamps `superseded-by`, moves the old numbered file into `archived/` (lowest-value frozen history), and preserves its provenance and number. Run `adrkit validate` to check the chain. Git records later changes; a format or path issue is a normal migration commit. Do not edit the archived choice or rationale silently.
