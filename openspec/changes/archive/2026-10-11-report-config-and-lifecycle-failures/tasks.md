# Tasks

## 1. Configuration type diagnostics

- [x] 1.1 Add regression cases through the production validation path for invalid `context`, `installed-with`, `tools`, `workflows`, and `rules` types, including mixed lists and null; run the focused tests and confirm they expose the current silent acceptance.
- [x] 1.2 Implement field/item-specific config-type diagnostics and integrate them into repository validation; verify the tests report the config path, expected type, zero-based rule-item index, and quoting hint for mapping-valued items.
- [x] 1.3 Add compatibility assertions for absent optional fields, valid empty containers, unknown keys, advisory string content, tolerant `list`, validation-driven `instructions`, and config comment preservation; run `npx vitest run test/commands.test.ts test/integrations.test.ts` and the config tests added in this group.
- [x] 1.4 Update `docs/cli.md` and `docs/zh/cli.md` to explain known-field type failures; verify the documented invalid-config example fails validation and its corrected form passes in a temporary repository.

## 2. Lifecycle partial-completion diagnostics

- [x] 2.1 Add isolated source-removal fault injection for both `archive` and `supersede` in `test/archive-seal.test.ts`; confirm the current errors omit partial-completion/recovery details while the archive and seal exist, without changing the replacement record.
- [x] 2.2 Add local post-seal source-removal error handling to both commands; verify diagnostics name both paths, preserve underlying error detail, explain completed sealing, and give inspection and recovery guidance without changing sealed bytes or manifest entries.
- [x] 2.3 Verify recovery by removing only the confirmed redundant active source in each fault-injection fixture and rerunning validation; run `npx vitest run test/archive-seal.test.ts` and retain successful-path and failed-seal rollback coverage.
- [x] 2.4 Document partial completion and recovery in both CLI references; compare the guidance with tested state and verify it avoids retry-by-number, archive rewriting, and removal before preserving unique content.

## 3. Integration verification

- [x] 3.1 Run `npm test`, `npm run typecheck`, and `npm run build`; confirm all pass and no new runtime dependency or CLI option was introduced.
- [x] 3.2 Run `openspec validate report-config-and-lifecycle-failures --strict --no-interactive` and `node bin/adrkit.js validate --all`; confirm both pass and review the implemented behavior against both delta specs before presenting completion.

## Workflow follow-up

- Review the completed change before syncing its delta specs and archiving it.
- Check the architectural decision inventory at archive time under the existing OpenSpec guidance; these local fixes are expected to require no new ADR.
