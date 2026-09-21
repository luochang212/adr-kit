## 1. Grammar and renderer

- [x] 1.1 Remove the stored `(round N)` field and parse/strip the legacy marker; verify a historical record still renders
- [x] 1.2 Style the unlock edge (a question nested below a non-root node) with `linkStyle`; verify a nested tree styles it and a flat tree does not

## 2. Tests and docs

- [x] 2.1 Test that a follow-up question parses under the node that raised it, indents by depth, and is styled in mermaid
- [x] 2.2 Update `docs/record-format.md` and `docs/zh/record-format.md`, `docs/cli.md` and `docs/zh/cli.md`, the READMEs, and the `adrkit-grill` skill and its mirror

## 3. Record

- [x] 3.1 Record ADR 7 and supersede ADR 6; verify `npm test` passes and `adrkit tree 7` renders the nested frontier
