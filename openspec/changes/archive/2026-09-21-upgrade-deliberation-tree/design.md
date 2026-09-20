## Context

See proposal.md - Why and ADR 5. The current parser
(`src/core/deliberation.ts`) matches `[status]` at end of line, which drops
nodes that carry a reason, and models a node as `{ text, status, children }`.

## Goals / Non-Goals

**Goals:** a grammar that carries type, state, recommendation, and reason; a
renderer that shows them; a one-file HTML view.

**Non-Goals:** client-side SVG layout; storing Mermaid as the source; changing
the appendix's role as reference material.

## Decisions

- **Parse from the end inward:** strip a trailing ` — reason`, then a trailing
  `(recommended)`, then the first `[status]`, then a leading `Q:`/`A:`.
  This makes the reason separator unambiguous and fixes the end-of-line bug.
- **Type is explicit or inferred.** `Q:`/`A:` win; otherwise a node with
  children is a question, a leaf an option, and the top level the root.
- **Override is computed, not stored:** a question's answer is its `[settled]`
  child; if that child is not `(recommended)`, the question is overridden.
- **Mermaid shapes:** root `(["…"])`, question `{{"…"}}`, option
  `["…"]`; classes by state; a `recommended` class and an `override`
  class carry the two extra signals.
- **HTML embeds the Mermaid source** in a minimal document that loads Mermaid
  from a CDN. The CLI stays dependency-free; viewing needs the network.

## Risks / Trade-offs

- [A node text contains ` — ` as prose, not a reason] -> the separator is
  em-dash with spaces, which the grammar reserves; prose can use a hyphen.
- [The generated HTML needs a CDN] -> documented; a hand-rolled SVG is the
  deferred alternative.
