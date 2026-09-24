# Tasks

## 1. Agent Workflows

- [x] 1.1 Update `adrkit-propose`, `adrkit-record`, and `adrkit-grill` to perform scoped overlap and full/partial supersession checks; update their integration mirrors and behavior assertions in `test/integrations.test.ts`, then run that test file.
- [x] 1.2 Update `adrkit-implement` and add a narrowly triggered `adrkit-review` skill for shipped-fact and active-record checks; wire the mirror, workflow selection, completion/help where applicable, and integration tests, then run `test/integrations.test.ts` and the relevant CLI tests.
- [x] 1.3 Update the generated standing-orders guidance and bilingual workflow documentation without adding ADR 17's deferred task-end check; verify the template mirror tests and documentation tests pass.

## 2. Archive Seals

- [x] 2.1 Add a versioned `adr/archived/MANIFEST.json` written by `adrkit init` and a core reader/writer that validates paths, duplicate entries, and SHA-256 hashes; add focused core and init tests, then run them.
- [x] 2.2 Make `archive` and `supersede` preflight and append the final archived file's seal without deleting the active source on a failed write; add success, duplicate, and failed-write command tests, then run the focused lifecycle tests.
- [x] 2.3 Make repository-wide and targeted `adrkit validate` detect unsealed, missing, malformed, extra, and changed archive content; update the archive/validate skills and bilingual record-format documentation, then run validation and lifecycle tests.

## 3. Append-Only History

- [x] 3.1 Add repository-wide `adrkit validate --base <git-ref>` with base snapshot verification and unchanged-prefix enforcement; reject targeted `--base`, update parser/help/completion, and prove coordinated file-plus-hash edits fail in focused tests.
- [x] 3.2 Fetch the comparison commit in CI and run base-aware validation for PR and main-push events; update bilingual CLI documentation and test the command against a real temporary Git repository with a newly appended archive and an unreadable base.

## 4. Dogfood And Integration

- [x] 4.1 Seal the existing archived ADRs without changing their bodies, update this repository's installed agent guidance where tracked, and verify `adrkit validate --all` passes while a deliberate archived-byte edit fails.
- [x] 4.2 Run `npm run typecheck`, `npm test`, `npm run build`, `node bin/adrkit.js validate --all`, OpenSpec strict validation, and `git diff --check`; resolve only failures caused by this change.
