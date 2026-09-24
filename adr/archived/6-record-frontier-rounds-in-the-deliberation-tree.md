---
status: superseded
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-21
commit: e816e44
superseded-by: 7
archived: 2026-09-25
archive-reason: superseded by ADR 7
tags: [grilling, deliberation, record-format]
---

# ADR: 6 record frontier rounds in the deliberation tree

## Problem

The `## Deliberation` tree records what a session settled, but not when a
question became askable. ADR 3's five questions are stored as siblings even
though the session asked two of them first and the rest only after those
answers existed; the frontier — the set of questions whose prerequisites are
settled — is the method's core, and the tree flattens it. The grammar cannot
express "this question only came up because that one was answered", and because
the tree is written after the session, the round order is reconstructed from
memory rather than recorded. ADR 3 cannot be repaired honestly: no stored
evidence says which question unlocked which.

## Decision

- **Record the frontier round on each question.** The grammar gains
  `(round N)`, so a node can be
  `- Q: <text> [status] (round N) (recommended)? — reason?`. A node's round is
  the round in which it entered the frontier; options inherit their question's
  round.
- **Derive the dependency from the round order.** A question in round N is only
  askable because earlier rounds were settled; the grammar records the natural
  sequence and does not ask the writer to hand-author edges.
- **Render rounds as layers.** `adrkit tree` labels nodes with their round and
  groups nodes into a per-round subgraph, so the picture shows the frontier
  moving outward.
- **Record rounds while the session runs, not after it.** The `adrkit-grill`
  skill appends each round's questions with their number as the round is
  answered.
- **Do not reconstruct rounds for existing trees.** ADR 3 and ADR 5 stay
  unannotated; a round remembered after the fact is not evidence.

## Alternatives considered

- **Explicit prerequisite edges (`after:`)**: rejected. Precise but
  hand-authored and error-prone, and it asks the writer to name a specific edge
  after the fact.
- **Rely on nesting alone**: rejected. Nesting a dependent question under the
  option that unlocked it conflates "sub-decision" with "depends on"; ADR 5
  already uses nesting for genuine sub-decisions.
- **Infer rounds from tree depth or order**: rejected. The tree records
  containment, not the order the frontier advanced.
- **Annotate ADR 3 from memory**: rejected. It would invent precision the
  record does not support.

## Consequences

- The grammar, parser, renderers, tests, docs, and the `adrkit-grill` skill
  change together; `deliberation-tree` gains a rounds requirement.
- A tree with rounds renders with a per-round subgraph; a tree without them
  (ADR 3, ADR 5) renders as before.
- The dependency stays coarse — a round depends on all earlier settled rounds,
  not one specific answer — which is the honest granularity of what the method
  records.

## Deliberation

- Record the frontier rounds in the design tree [settled]
  - Q: Which relation should the grammar record? [settled]
    - A: Round numbers, with the dependency derived from the order [settled] (recommended)
    - A: Explicit after references [rejected] — precise but hand-authored and error-prone
    - A: Nesting only [rejected] — conflates a sub-decision with a dependency
  - Q: What about existing trees with no recorded rounds? [settled]
    - A: Leave them unannotated and apply rounds to new sessions only [settled] (recommended) — do not invent retroactive precision
    - A: Mark the historical tree as reconstructed [rejected] — a round remembered later is not evidence
