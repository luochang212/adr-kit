# Proposal: add-decision-graph

## Why

An ADR corpus records its evolution in two places: the machine-checked front
matter (numbered records, dates, `superseded-by` edges) and the prose bodies
(cross-references like "this supersedes the K8s branch of ADR-12"). Neither
is visible at a glance today; a reader must open every file to reconstruct
how the architecture evolved. A graph view generated from the records makes
that evolution legible without any new tooling on the reader's side, because
GitHub renders Mermaid natively.

## What Changes

- Add an `adrkit graph` command that reads the decision repository and
  emits a node-link view of the decisions.
- Three output formats: `--mermaid` (default), `--dot`, and `--json`.
- Two edge kinds, visually distinct:
  - solid edges for formal `superseded-by` front matter references;
  - dashed edges for `ADR-N` references mined from record bodies.
- Mined-reference hygiene: self-references are ignored, and a mined edge
  between two records already joined by a formal edge is deduplicated.
- Temporal grouping without a fake continuous axis: Mermaid groups nodes
  into per-date subgraphs; DOT uses date-ranked left-to-right layout.
- Mermaid nodes link to their record files; superseded nodes are styled
  distinctly.
- `--formal-only` restricts the graph to front-matter edges.
- Zero new runtime dependencies; the command emits text only.

## Capabilities

### New Capabilities

- `decision-graph`: generating decision relationship graphs (Mermaid, DOT,
  JSON) from a decision repository, including reference mining, edge
  deduplication, and date grouping.

### Modified Capabilities

(none - existing commands and the record format are unchanged)

## Impact

- New `src/core/graph.ts` (graph construction: record loading, reference
  mining, edge deduplication - no console or argv usage, per repo
  conventions).
- New `src/commands/graph.ts` and a dispatch case + help entry in
  `src/cli.ts`.
- `src/commands/completion.ts` gains the `graph` command.
- Tests in `test/graph.test.ts` (and a CLI-surface test) build real repos
  in temp directories and assert on emitted text.
- Docs: README (en/zh) command table, `docs/cli.md` (en/zh).
- A changeset ships with the feature.
