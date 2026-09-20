---
"adr-kit": minor
---

Add an annotated `## Deliberation` grammar and a richer tree view. A node can
carry a `Q:`/`A:` type, a `[settled]`/`[rejected]`/`[open]` state, a
`(recommended)` marker on the option the agent recommended, and a ` — reason`.
`adrkit tree` renders distinct root, question, and option shapes with state
colors, marks the recommended option, and marks a question whose settled option
is not the recommendation as an override. `adrkit tree <name> --html` emits a
single self-contained HTML document.
