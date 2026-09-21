## 1. Deliberation parsing

- [x] 1.1 Make the em dash with spaces the only reason separator and delete the legacy hyphen fallback; verify a ` - ` in the node text keeps `[settled]` and `(recommended)` and is read as text
- [x] 1.2 Delete the `(round N)` reader, migrate ADR 6's own tree off the marker, and verify an unknown parenthetical renders as text instead of being interpreted
- [x] 1.3 Share one escaping and wrapping helper (`src/core/view-text.ts`) and wrap by display width with wide characters counted double; verify a Chinese title and a Chinese Mermaid label wrap instead of overflowing

## 2. Lifecycle and CLI

- [x] 2.1 Carry `tags` through `stampLifecycleMove` and `proposalToDecision`; verify a superseded decision and an accepted draft keep their tags and validate, and restore the tags ADR 5 and ADR 6 lost
- [x] 2.2 Reject two format flags on `adrkit tree` with the error `graph` already gives, and verify `main(['tree', '1', '--html', '--mermaid'])` exits non-zero
- [x] 2.3 Drop `buildDecisionGraph`'s `created ?? date` fallback and report the invalid record instead; verify both graph formats refuse a record with no `created`

## 3. Offline views

- [x] 3.1 Accept `metaKey` as well as `ctrlKey` in the canvas wheel handler and note the browser-zoom trade-off in the canvas changeset
- [x] 3.2 Key the card tree's unlock edge off the source node so a settled option on the root card matches Mermaid's styling

## 4. Docs, spec, and gates

- [x] 4.1 Replace the stale `adrkit tree` samples in `docs/cli.md` and `docs/zh/cli.md` with real renderer output and pin them with a test in `test/docs.test.ts`
- [x] 4.2 Document the single separator and the override precondition, and drop the legacy-hyphen claim, in `docs/record-format.md` and `docs/zh/record-format.md`
- [x] 4.3 Update the `deliberation-tree` spec for the override precondition, the single separator, conflicting formats, and wrapping without spaces
- [x] 4.4 Run `npm run typecheck`, `npm test`, `npm run build`, `npm run check:upstream`, `adrkit validate`, and `openspec validate --strict`
