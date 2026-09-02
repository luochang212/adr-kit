# Tasks: add-decision-graph

## 1. Core graph model

- [x] 1.1 Create `src/core/graph.ts` with the graph model types (node,
      formal edge, reference edge) and `buildDecisionGraph(records)`:
      reference mining via `ADR-?\s*[1-9]\d*` over record bodies,
      self-reference removal, nonexistent-number filtering,
      formal-pair deduplication, deterministic (source, target) edge order
- [x] 1.2 Unit-test the model in `test/graph.test.ts`: mined edges from a
      real-shaped record, self-reference ignored, missing target ignored,
      formal duplicate dropped, `--formal-only` projection empty of
      reference edges

## 2. Emitters

- [x] 2.1 Mermaid emitter: `flowchart LR`, per-date subgraphs titled
      `YYYY-MM-DD (N)`, quoted `N title` labels, solid labeled supersede
      edges, dashed reference edges, `classDef retired` + class assignment
      for superseded nodes, `click` statements with `adr/decisions/...`
      POSIX paths
- [x] 2.2 DOT emitter: `digraph` with `rankdir=LR`, `{rank=same}` per date
      group, quoted escaped labels, labeled solid edges and dashed edges
- [x] 2.3 JSON emitter: decisions array (number, title, status, date,
      fileName, path, supersededBy, references) plus both edge lists
- [x] 2.4 Emitter tests asserting exact output strings for a fixed small
      repo (two dates, one supersede, cross references)

## 3. Command and CLI surface

- [x] 3.1 `src/commands/graph.ts`: resolve root, load records, build
      graph, emit selected format; conflicting format flags error naming
      both
- [x] 3.2 `src/cli.ts`: dispatch, help line, options (`mermaid`, `dot`,
      `json`, `formal-only`), add `graph` to `JSON_COMMANDS`
- [x] 3.3 `src/commands/completion.ts`: add `graph` to `COMMANDS`
- [x] 3.4 Command tests: default emits Mermaid, `--dot`/`--json` shapes,
      format conflict exits non-zero, outside-repository error,
      drafts excluded

## 4. Docs and release

- [x] 4.1 README.md + README.zh.md command table entries
- [x] 4.2 docs/cli.md + docs/zh/cli.md `graph` section (note the
      date-semantics caveat: `date` is the current-status date)
- [x] 4.3 Changeset (minor)
- [x] 4.4 Full gate: `npm run typecheck`, `npm test`, `npm run build`,
      plus a smoke run against a real repository
