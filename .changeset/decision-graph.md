---
'adr-kit': minor
---

Adds `adrkit graph`: a decision relationship view of the repository. Solid
edges are formal `superseded-by` references, dashed edges are `ADR-N`
mentions mined from record bodies, and decisions group into per-date
subgraphs so bursts stay visible without a fake continuous timeline.
`--mermaid` (default, renders on GitHub), `--dot`, and `--json` outputs;
`--formal-only` restricts to front-matter edges.
