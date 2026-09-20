## 1. Grammar and parser

- [x] 1.1 Extend the deliberation node model with `round` and parse `(round N)` in the end-inward pass; verify a question's round is parsed and a malformed marker is ignored
- [x] 1.2 Group a parsed tree by round and verify options inherit their question's round

## 2. Renderers

- [x] 2.1 Render per-round subgraphs in Mermaid output and a round marker in text output; verify an annotated tree groups by round and an unannotated tree is unchanged

## 3. Recording and docs

- [x] 3.1 Document `(round N)` in `docs/record-format.md` and `docs/zh/record-format.md`, and update the `adrkit-grill` skill and its mirror so each round is appended as it is answered
- [x] 3.2 Verify `npm test` passes and use the change's own grilling session as the acceptance sample
