---
name: adrkit-archive
description: Use when an implemented record no longer guides work and current behavior has another authoritative owner.
---

# ADR Kit Archive

Confirm the record has shipped, its distinct rationale no longer guides future work, and current behavior has another authoritative owner. Do not archive by age or quota. Run `adrkit archive <N> --reason "<owner and why retired>"`. The numbered record moves from `implemented/` to frozen `archived/`, its number and history remain, and the command appends a content seal for the final archived file to `adr/archived/MANIFEST.json`. Validate afterward. Never edit an archived file or its seal after archival; if validation reports drift, restore the sealed bytes. If a newer implemented decision fully replaces it, use `adrkit supersede --by` instead; partial replacement leaves the still-relevant record active.
