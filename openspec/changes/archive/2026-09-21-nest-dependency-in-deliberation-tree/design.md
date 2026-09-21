## Context

See proposal.md - Why, ADR 5, and ADR 7. ADR 5's tree already nests follow-up
questions under the option that raised them; ADR 3 and ADR 6 store flat lists.
`src/core/deliberation.ts` parses arbitrary nesting already, and its mermaid
renderer draws every parent-to-child edge the same way.

## Goals / Non-Goals

**Goals:** dependency recorded as nesting; no stored round; the renderer makes
the frontier visible; historical flat trees keep working.

**Non-Goals:** reconstructing ADR 3's or ADR 6's dependency; a topic taxonomy; a
separate `after:` edge syntax.

## Decisions

- **Nesting is the only dependency channel.** A follow-up question sits under the
  option (or question) whose settlement raised it. Unrelated questions stay
  siblings, so flat means independent.
- **No stored round.** A node's frontier round is its depth in the nesting; the
  grammar loses `(round N)`. One fact stays in one place.
- **The unlock edge is styled.** An edge from a settled non-root node to a
  follow-up question is drawn thicker and purple via `linkStyle`, so progression
  is visible from the structure and state. Open, rejected, or unannotated parents
  keep ordinary edges, as required by ADR 7.
- **Legacy `(round N)` is stripped on read.** ADR 6's records keep rendering
  cleanly without reintroducing the concept.

## Risks / Trade-offs

- [A follow-up raised by the question, not an option, has no single parent] -> it
  nests under the question, beside the options; the `Q:` prefix keeps it
  distinct.
- [Deep nesting can get tall] -> label wrapping and spacing are set in the
  renderer; the alternative (flat plus labels) hides the relation entirely.
