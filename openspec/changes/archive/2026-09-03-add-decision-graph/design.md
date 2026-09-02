# Design: add-decision-graph

## Context

Records already carry everything the graph needs: number, title, status,
date, and `superseded-by` in front matter (all machine-checked by the
parser), plus `ADR-N` mentions in bodies. `listRecords` returns parsed
records in number order. The repo convention is that core logic lives in
`src/core/`, stays free of `console`/`process.argv`, and commands are thin
emitters in `src/commands/`. Rendering is deliberately not our problem:
GitHub renders Mermaid natively, Graphviz users already have `dot`.

## Goals / Non-Goals

**Goals:**

- One new pure module (`src/core/graph.ts`) that turns records into a
  graph model, plus three text emitters for it.
- Honest edges: formal and mined references stay visually distinct;
  partial supersession expressed only in prose stays a dashed edge.
- Deterministic output (stable node order, sorted edges) so tests can
  assert exact strings and diffs stay reviewable.

**Non-Goals:**

- Rendering images, opening browsers, or shipping a web view.
- Mining semantic relation types from prose ("supersedes partially",
  "aligns with") - `ADR-N` mentions are the whole mining vocabulary.
- Timeline layout beyond date grouping; no continuous time axis.
- New front matter fields (tags, domains) - deferred until users ask.
- Git-history mining to recover creation dates of superseded records.

## Decisions

**Graph model first, emitters second.** `src/core/graph.ts` builds
`{ nodes, formalEdges, referenceEdges }` from `AdrRecord[]`; emitters
consume the model. Mermaid, DOT, and JSON then cannot disagree about the
graph itself. Alternative - emit per-format directly from records - was
rejected because the three formats would re-implement dedup/ordering
independently.

**Reference mining = one regex over section bodies.**
`/ADR-?\s*[1-9]\d*/g` case-sensitive, matching the corpus convention
(`ADR-12`, `ADR 4`). Mined targets keep only numbers that exist as
decisions (a mention of a missing number becomes no edge, matching how
prose can reference proposals or external ADRs). Self-mentions are dropped.
Dedup rule: a mined edge A→B is dropped when A or B carries a formal
supersede edge between the same pair. Alternatives considered: parsing
only `Alternatives considered` sections (too narrow - the K8s supersession
lives in `Decision`), or NLP-ish relation detection (out of scope).

**Node order and edge order are deterministic.** Nodes in number order;
grouped by date in chronological order (date string sort is correct for
`YYYY-MM-DD`). Edges sorted by (source, target). This makes emitters
diff-stable and lets tests assert exact output.

**Date grouping without fake continuity.** Mermaid: one `subgraph` per
distinct date, titled `YYYY-MM-DD (N)`, chronological left-to-right
(`flowchart LR`, `direction TB` inside each subgraph). DOT: `{rank=same}`
cluster per date with `rankdir=LR`. No empty date buckets between pulses -
gaps stay gaps, per the "ordinal axis with real labels" decision made with
the user. Records missing dates cannot occur (parser enforces the field).

**CLI surface.** `graph [--mermaid] [--dot] [--json] [--formal-only]`.
Exactly one format flag allowed; two set → error naming both. `graph` needs
a repository (via `requireRoot`) and joins the `JSON_COMMANDS` set in
`src/cli.ts` so the `--json` flag gate accepts it.

**Mermaid escaping and links.** Node labels are double-quoted; titles are
used verbatim (full-width punctuation is safe inside quotes). `click`
targets are repository-relative POSIX paths (`adr/decisions/N-slug.md`) -
consistent with `relativePath` elsewhere. Superseded styling via
`classDef retired` + `class` assignment.

**DOT escaping.** Labels double-quoted with `"` escaped as `\"`; node ids
`n<N>`; formal edges `n<A> -> n<B> [label="superseded by"]`, mined edges
`n<A> -> n<B> [style=dashed]`.

**JSON shape.** `{ decisions: [{number,title,status,date,fileName,path,supersededBy?,references:[N]}], supersedeEdges, referenceEdges }`
where edges are `{from,to}` pairs of numbers. `references` per node keeps
the JSON self-contained for external tools.

## Risks / Trade-offs

- [Regex mining produces false positives (e.g., `ADR-100` in example code)]
  → Mentions of nonexistent decision numbers are silently ignored; the
  mined vocabulary stays trivially auditable.
- [Long CJK titles make wide Mermaid nodes] → Accepted for v1; a future
  `--short-titles` can cut at the first `：`. Full title always lives in
  the click target's file.
- [Formal model cannot express partial supersession] → Dashed edges are
  the honest representation; changing the format is a separate change.
- [`date` is the current-status date, not creation date] → Documented in
  the command's help text; creation-date recovery via git history is an
  explicit non-goal.
