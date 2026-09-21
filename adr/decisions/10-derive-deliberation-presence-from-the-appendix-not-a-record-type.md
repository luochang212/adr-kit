---
status: accepted
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: b79fff0
tags: [deliberation, record-format, agent-integration]
---

# ADR: 10 Derive deliberation presence from the appendix, not a record type

## Problem

The decision map marks which records carry a deliberation tree, and a user
wanted to filter by that. Distinguishing a grilling record from a direct one has
no reliable marker: `## Deliberation` is present for some grilled records but
missing for others (ADR 1 was grilled with no tree), tags are inconsistent, and
the two provenance fields are identical for both origins. ADR 3 already rejected
a mixed `grill | direct | proposal` method enum because it conflates
deliberation with the lifecycle path. The open question was whether to add a
structured record type so a view could filter, or accept the derived signal.

## Decision

- Add no record type or method field. The two provenance fields stay the only
  declared classification, and the record format does not grow a taxonomy.
- The machine predicate is derived from the appendix and means exactly "this
  record has a renderable deliberation tree": `has-deliberation` is true when
  the `## Deliberation` appendix parses to at least one node. The map marker
  and `adrkit tree` use the same notion, so the badge never promises a tree that
  the command cannot render.
- Treat "was this decision grilled" as not representable. The product question
  is whether a recorded design tree exists, which is verifiable from the file;
  the process that produced a record is not.
- Filtering, when wanted, is explicit and uses this derived predicate, never
  automatic exclusion, consistent with ADR 9.

## Alternatives considered

- **An orthogonal `deliberation: grill | direct` field**: rejected for now. It
  is the only axis with a real gap (a grilled record with no tree), but no
  consumer needs it: every view question is answered by whether a tree exists,
  and a declared value that is never cross-checked would be a false-provenance
  risk the repository already avoids.
- **A general `kind` taxonomy for future record types**: rejected. No second
  kind exists, and adding one now is speculative format surface against the
  plain-Markdown philosophy.
- **One mixed `type` enum (`grill | direct | proposal`)**: rejected; this is
  ADR 3's rejected alternative, conflating deliberation with lifecycle path.
- **A `grilling` tag convention**: rejected. Tags are free-form thematic
  keywords, several records carry none, and a type is not a theme.
- **Keep the map marker on a non-empty appendix body**: rejected. It promised a
  tree for a prose-only appendix that `adrkit tree` then refused to render.

## Consequences

- The map badge and `adrkit tree` renderability are now the same predicate by
  construction, which is what ADR 9's "mark, don't exclude" and its future
  linkage hook need.
- No front matter, parser, validator, template, or migration change is needed,
  so the format stays as it is.
- "Which decisions were grilled" remains unanswerable by design. If a concrete
  consumer ever needs it, it requires a declared field and its own decision;
  absent that, the derived predicate is the whole story.

## Deliberation

- Classify records for the decision views [settled]
  - Q: Is the `## Deliberation` heading a good machine anchor? [settled]
    - A: Yes for "has a tree"; it is derived through the parser and already surfaced as the map marker [settled] (recommended)
    - A: No; add a declared field instead [rejected] — the anchor answers the product question, and a field adds cost without a consumer
  - Q: What does the anchor mean? [settled]
    - A: "This record has a renderable deliberation tree", not "it was grilled" [settled] (recommended)
    - A: "This record was produced by grilling" [rejected] — ADR 1 was grilled with no tree, so no anchor can tell
  - Q: Should the record format add a type or method field? [settled]
    - A: No; derive from the appendix and keep the format unchanged [settled] (recommended)
    - A: Add an orthogonal `deliberation: grill | direct` field [rejected] — no consumer needs it and it risks false provenance
    - A: Add a general `kind` taxonomy [rejected] — speculative with no second kind
    - A: A mixed `type` enum [rejected] — ADR 3 already rejected the conflation
  - Q: What exactly makes the predicate true? [settled]
    - A: The appendix parses to at least one node, matching what `tree` renders [settled] (recommended)
    - A: Any non-empty appendix body [rejected] — marks a prose-only section that `tree` refuses
