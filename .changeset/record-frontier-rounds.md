---
"adr-kit": minor
---

Record the frontier round in the `## Deliberation` grammar. A question may
carry `(round N)`, the round in which it entered the frontier; options inherit
their question's round. `adrkit tree --mermaid` groups each round into a labeled
subgraph, and the `adrkit-grill` skill records each round as it is answered
rather than reconstructing the order afterward. Existing trees without round
annotations render as before.
