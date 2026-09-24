---
status: implemented
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: 02536cc
tags: [skills, visualization, agent-integration]
---

# ADR: 13 Separate ADR visualization from the grilling workflow

## Problem

ADR 8 and ADR 9 placed visualization routing in `adrkit-grill`, and ADR 12
retained that routing while changing browser delivery. The maintainer found
that the skill name no longer described its combined responsibilities and
requested the proposed split. Viewing an existing record does not require
interrogating a decision or creating another record.

## Decision

Keep `adrkit-grill` for questioning, settling, and recording decisions. Move
existing-record visualization to the first-party `adrkit-visualize` skill,
installed through the same integration mechanism and selectable with
`--workflows visualize`. Both remain in the default workflow set; explicit
workflow subsets remain explicit and are not silently expanded.

The new skill owns both `adrkit tree <N> --html` for one record's deliberation
and `adrkit graph --html` for the whole set, with no invented missing trees.
It preserves the browser-opening default, file link, opt-out, and fallback
from ADR 12. It does not start grilling or write records. This amends only
the skill-routing portions of ADR 8, ADR 9, and ADR 12; the renderers and their
other constraints remain unchanged, including ADR 10's derived tree presence.

## Alternatives considered

- Rename the combined skill more broadly: rejected because it still combines
  questioning and viewing, making both discovery and loaded instructions less
  focused.
- Keep visualization in `adrkit-grill`: rejected because its name implies
  questioning while it also handles viewing unrelated existing decisions.

## Consequences

There are now nine first-party workflows. The maintained skills and embedded
integration templates must stay synchronized. Default installations receive
both skills; users with explicit subsets add `visualize` or select `all` when
updating. No CLI command or runtime dependency is added. The maintainer raised
the naming problem and explicitly requested the split after the agent proposed
it; both provenance fields record that direction as human.
