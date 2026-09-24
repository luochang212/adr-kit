---
name: adrkit-review
description: Use when checking whether changed code and changed decision records still agree; scoped to record coherence, not general code review.
---

# ADR Kit Review

Review decision-record coherence for a change, not general code quality. Run `adrkit list` first, then:

- Compare each changed or newly shipped record with the changed code and tests: claimed paths, names, defaults, mechanisms, and verification evidence must match what actually shipped.
- Search active implemented records for realization facts the change invalidated — moved files, renamed options, altered defaults, changed behavior — and report each stale record for a factual update in the same change. A decision reversal is a new record with an explicit relationship, never a rewrite of old rationale.
- Look for unresolved supersession: a new record that fully replaces an active one without `adrkit supersede --by`, or a partial overlap that should be linked in prose while both stay active.

Report evidence-backed findings that name the record and the code evidence. Finding no issue is a valid result; do not demand a record for a mechanical edit. A disagreement with the decision itself is a design question to raise, not a license to rewrite a historical record. Archived records are sealed history: report changes to them rather than editing them.
