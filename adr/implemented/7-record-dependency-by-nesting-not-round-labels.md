---
status: implemented
date: 2026-09-21
raised-by: human
decided-by: human
created: 2026-09-21
commit: e816e44
tags: [deliberation, visualization, record-format]
---

# ADR: 7 Record dependency by nesting, not round labels

## Problem

The deliberation tree flattened a session's follow-up questions into siblings
of the root and patched the lost order with a `(round N)` label. The label does
not render as progression: every question stays a child of the root, so two
dependent questions draw as parallel boxes. It also duplicates a relationship
the outline can already express. ADR 5's own tree already nests its
follow-up questions under the option that raised them, so the same file format
carried two contradictory conventions, and ADR 3's flat tree read as if its
five questions were independent when they were not.

## Decision

- **Dependency is nesting.** A follow-up question is a child of the node whose
  settlement raised it: the chosen option, or the question itself when the
  question (not one option) triggered it. Related questions go deeper;
  unrelated questions stay flat siblings. The `Q:`/`A:` prefix keeps a
  follow-up question distinct from an option at the same depth.
- **Frontier rounds are derived, not stored.** A node's round is its depth in
  the dependency tree; the renderer may name the layers, but nothing in the
  record stores a round. `(round N)` is removed from the grammar. This
  supersedes ADR 6.
- **The rendering styles the unlock edge.** The edge from a settled node to the
  follow-up question it raised is drawn distinctly, so the tree's depth reads as
  the frontier moving outward, and the structure is the only source for it.

## Alternatives considered

- **Keep `(round N)` on a flat list** (ADR 6): rejected. It is a second
  representation of the same relation, it can disagree with the nesting, and it
  does not render as progression.
- **Explicit `after:` edges**: rejected. Precise, but a hand-authored second
  channel that encodes in prose what nesting already encodes structurally.
- **Nest by topic rather than by what raised the question**: rejected. Topic is
  a classification, not a dependency; two questions about "storage" are not
  ordered, and the depth would stop meaning anything.
- **Duplicate an option-independent follow-up under every option**: rejected.
  It fans out and stops being one question in one place.

## Consequences

- `adrkit tree` draws progression from the outline alone; a nested tree needs
  no round annotation to show a later question downstream of an earlier one.
- ADR 3 and ADR 6 keep their flat trees; their questions now read as
  independent, which is the honest limit of what they recorded.
- The grammar loses `(round N)` and gains no field; the `adrkit-grill` skill
  records each follow-up question under the node that raised it while the
  session runs.

## Deliberation

- Record dependency as nesting, not round labels [settled]
  - Q: What encodes the dependency between questions? [settled]
    - A: Keep the (round N) label on a flat list [rejected] — a second representation that does not render as progression
    - A: Explicit after references [rejected] — precise but a hand-authored second channel
    - A: Nest a follow-up question under the node whose settlement raised it [settled] (recommended) — related goes deeper, unrelated stays flat
      - Q: Where does a question go when the question, not one option, raised it? [settled]
        - A: Nest it under the question, beside the options [settled] (recommended) — the Q: prefix keeps it distinct
        - A: Duplicate it under every option [rejected] — fans out and stops being one question in one place
        - A: Force it under the chosen option [rejected] — invents a prerequisite the session did not have
      - Q: What happens to the stored frontier round? [settled]
        - A: Derive it from depth as a view [settled] (recommended) — one fact, one place
        - A: Keep storing (round N) beside the nesting [rejected] — two sources that can disagree
        - A: Drop the round concept entirely [rejected] — the frontier layer is still worth naming
  - Q: How should the picture show the progression? [settled]
    - A: Style the unlock edge from a settled node to the follow-up it raised [settled] (recommended) — the tree edge becomes the frontier step
    - A: Wrap each round in a subgraph band [rejected] — the clusters cut across the tree
    - A: A round-spine node [rejected] — invents nodes the record does not contain
