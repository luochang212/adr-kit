---
"adr-kit": minor
---

Render `adrkit graph --html` as an offline, self-contained decision map: a
bespoke static layout with supersede and reference edges, creation-date
columns, and tag tinting. Nodes link to their record and mark the records that
carry a `## Deliberation` tree. The grilling skill routes a single-decision
request to `tree --html` and a whole-set request to `graph --html`. See ADR 9.
