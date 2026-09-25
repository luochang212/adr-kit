# Tasks

> **Known limitation.** OpenSpec 1.13.2 refuses to rename a scenario title inside a `MODIFIED` requirement: the scenario-loss guard reports the old title as dropped and archive aborts (Fission-AI/OpenSpec issue #1697, open). Every stale word in requirement text, scenario bodies, and requirement headings is corrected by this change. A scenario title that only embeds a removed word keeps that title verbatim; renaming it needs a future OpenSpec release or a separate requirement rename. Residual titles: cli-option-surface's `an option belonging to another command is rejected on decide`; decision-provenance's `accepted record carries the field`, `accepted record without the field fails`, `decide records the declaration`, and `decide records` (each appears twice). decision-provenance's `Purpose` also still names `decide`/`accept`/draft; a delta cannot rewrite an existing capability's Purpose, and this change is restricted to `openspec/changes/`, so that paragraph, and the residual scenario titles named above, are corrected by a direct main-spec edit after this change is archived.

## 1. Reconcile the four-folder vocabulary in the spec deltas

- [x] 1.1 Confirm every delta under `openspec/changes/reconcile-four-folder-specs/specs/` reuses the correct main-spec requirement heading and reproduces the full requirement text, then run `openspec validate "reconcile-four-folder-specs" --strict` and confirm it passes.
- [x] 1.2 Confirm the deltas no longer name the removed model in requirement text or scenario bodies by grepping the change for `adr/decisions/`, `adr/.drafts/`, `decide`, `accept`, `status: accepted`, and draft wording; verify the only remaining hits are the scenario titles listed in the note above and that `openspec validate --all --strict` passes.
- [x] 1.3 When the change is archived, confirm `openspec archive` merged the deltas into `openspec/specs/` — decision-provenance gains `Proposals carry no decided-by`, record-lifecycle gains `Supersede target is an implemented decision`, decision-graph drops `reads only durable decisions` — by re-reading `openspec show decision-provenance --type spec` and the `git diff openspec/specs/`.

## 2. Require the archive manifest even when the archive is empty

- [x] 2.1 Confirm repository-wide `adrkit validate` reports a missing `adr/archived/MANIFEST.json` instead of passing an empty archive; verify the rule in `src/core/validate.ts` (`archiveSealIssues`) and the test `test/archive-seal.test.ts` "reports a missing manifest even when the archive is empty". The implementation and tests landed in commit `4e20c7c`; re-run them before closing.
- [x] 2.2 Confirm `adrkit init` writes the empty manifest (`{"version":1,"entries":[]}`) by initializing a repository in a temp directory and checking the file; add or adjust a command test in `test/commands.test.ts` if the init path is not already covered.
- [x] 2.3 Confirm the `archive-integrity` delta states the manifest requirement with its `Empty archive still needs a manifest` and `init writes the empty manifest` scenarios, matching the shipped behavior, and that the archived main spec still reads that way.

## 3. Distinguish an absent base manifest from an unreadable one

- [x] 3.1 Confirm `adrkit validate --base <ref>` treats an absent base manifest as no prior seals but fails with an actionable error naming the ref when the manifest path exists at the base and cannot be read; verify the branch in `src/core/validate.ts` (`validateRepositoryWithBase`) and the test `test/archive-seal.test.ts` "fails when the base manifest exists but its content cannot be read". The implementation and tests landed in commit `4e20c7c`; re-run them before closing.
- [x] 3.2 Confirm the `archive-integrity` delta states the distinction with its `Base manifest exists but cannot be read` scenario alongside the existing `Git base cannot be read` scenario, and that the archived main spec still reads that way.

## 4. Docs and integration checks

- [x] 4.1 Confirm `docs/record-format.md`, `docs/zh/record-format.md`, `docs/cli.md`, `docs/zh/cli.md`, and the `adrkit-validate` skill mirror describe the manifest and base-aware rules as shipped (updated in `4e20c7c`); correct any drift and run `npm test` so `test/integrations.test.ts` proves the skill mirror stays in sync.
- [x] 4.2 Run `npm run typecheck` and `npm test`, then `openspec validate "reconcile-four-folder-specs" --strict` and `openspec validate --all --strict`, and confirm every command exits zero.
