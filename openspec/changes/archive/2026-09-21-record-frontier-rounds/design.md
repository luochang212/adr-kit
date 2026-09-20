## Context

See proposal.md - Why and ADR 6. `src/core/deliberation.ts` already parses
`Q:`/`A:`, `[status]`, `(recommended)`, and ` — reason` from the end inward;
the tree renderer walks a node tree and emits text or Mermaid. ADR 3's tree
proves the gap: five sibling questions that were actually answered in rounds.

## Goals / Non-Goals

**Goals:** record the frontier round on each question; derive a question's
dependency on earlier rounds from round order; group a rendered tree by round;
keep unannotated trees valid and unchanged.

**Non-Goals:** reconstructing rounds for ADR 3 or ADR 5 after the fact; an
arbitrary question-to-question edge (`after: 3a`); a schema change to the front
matter.

## Decisions

- **The round is an annotation on the question, not a new field.** The front
  matter stays `raised-by`/`decided-by` only; the round lives in the appendix
  where the tree already lives.
- **Dependency is round order.** Every question in round N may depend on
  anything in rounds < N, and options inherit their question's round. This is
  coarser than an explicit edge but natural and unambiguous to record while the
  session runs.
- **Parse `(round N)` in the same end-inward pass**, after `(recommended)` and
  before the status; a malformed `(round x)` is not a round.
- **The renderer groups only when annotations exist.** Nodes with a round become
  a labeled Mermaid subgraph per round; nodes without one render as today, so
  ADR 3 and ADR 5 keep working.

## Risks / Trade-offs

- [Round order is coarser than the true dependency graph] -> accepted: a
  correct coarse edge beats an invented precise one, and the grammar can gain
  an explicit edge later.
- [A session that does not record rounds loses them again] -> the skill appends
  each round as it is answered, so recording is part of the session, not a
  summary written after it.
