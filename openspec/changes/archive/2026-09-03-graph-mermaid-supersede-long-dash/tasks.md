# Tasks: Mermaid supersede edges as long dashes

## 1. Implement linkStyle emission

- [x] 1.1 In `mermaidGraph()` (`src/core/graph.ts`), build the full ordered edge list (`formal` then `references`), and append one `linkStyle <index> stroke-dasharray:11 7` line per formal supersede edge, where `<index>` is the edge's position in that ordered list (0-based), matching mermaid's linkStyle indexing.
- [x] 1.2 Keep the `==>|superseded by|` syntax, direction, labels, `classDef`/`class`/`click` blocks, and the blank-line block separation unchanged; the new linkStyle lines form their own trailing block only when formal edges exist.

## 2. Tests

- [x] 2.1 Extend the mermaid grouping test in `test/graph.test.ts` (the one asserting `n1 ==>|superseded by| n3`) so it also asserts a `linkStyle 0 stroke-dasharray:11 7` line exists when one formal edge is present.
- [x] 2.2 Add a case with multiple formal edges plus reference edges, asserting each formal edge gets its own correctly-indexed linkStyle (per-edge index, references untouched).
- [x] 2.3 Add a case with references only (no formal edges): assert no `linkStyle` line is emitted.

## 3. Verify and validate

- [x] 3.1 Run the graph tests and the full suite (`npm test`).
- [x] 3.2 Run `adrkit graph --mermaid` in a fixture/sample repo with a superseded decision and visually confirm (mermaid render) the supersede edge renders long-dashed.
- [x] 3.3 `openspec validate --strict graph-mermaid-supersede-long-dash` passes.
