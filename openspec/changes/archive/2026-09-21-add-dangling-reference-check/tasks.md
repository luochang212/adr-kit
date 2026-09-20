## 1. Validation rule

- [x] 1.1 In `validateRecordReferences`, scan the record body with the graph reference pattern, exclude the title line and self-references, and report unresolved numbers; verify a record naming `ADR-99` fails validation and one naming `ADR-1` passes
- [x] 1.2 Add the regression test (red on the dangling fixture, green on the resolving fixture) and verify `npm test` passes

## 2. Docs

- [x] 2.1 Document the dangling-reference check in `docs/record-format.md` and `docs/zh/record-format.md`; verify `npx vitest run test/docs.test.ts` passes
