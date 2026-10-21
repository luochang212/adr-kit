---
name: adrkit-archive
description: Use when an implemented record no longer guides work and current behavior has another authoritative owner.
---

# ADR Kit Archive

Archiving keeps the active set small enough to actually be read: guidance that stopped earning its context budget retires to archived history.

Confirm the record has shipped, its distinct rationale no longer guides future work, and current behavior has another authoritative owner. Do not archive by age or quota. Run `adrkit archive <N> --reason "<owner and why retired>"`. The numbered record moves from `implemented/` to `archived/` — the lowest-value folder: frozen history, not current authority, and not read by default. Its number and history remain. Validate afterward. Git records later changes; a format or path issue is a normal migration commit rather than an unfixable frozen record. If a newer implemented decision fully replaces it, use `adrkit supersede --by` instead; partial replacement leaves the still-relevant record active.
