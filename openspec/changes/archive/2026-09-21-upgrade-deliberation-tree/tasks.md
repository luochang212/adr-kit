## 1. Grammar and parser

- [x] 1.1 Extend the deliberation node model with type, recommended, and reason, and parse the annotated grammar from the end inward; verify a reason after a status is parsed and a `Q:`/`A:` node is typed
- [x] 1.2 Compute the override signal (a question whose settled child is not recommended) and verify both the override and the taken-recommendation cases

## 2. Renderers

- [x] 2.1 Render text and Mermaid with distinct root/question/option shapes, state colors, the recommended marker, and the override marker
- [x] 2.2 Add `adrkit tree <name> --html` outputting one self-contained HTML document, wire it through the CLI and completion, and verify the command prints HTML

## 3. Migration and docs

- [x] 3.1 Migrate ADR 3's tree to the annotated grammar and use it as the acceptance sample: `adrkit tree 3` must show the reason on rejected nodes and mark any override
- [x] 3.2 Document the grammar and the HTML mode in `docs/record-format.md` and `docs/zh/record-format.md`, update the `adrkit-grill` skill and its mirror, and verify `npm test` passes
