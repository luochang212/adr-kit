# Verification

Delivered 2026-10-14 in the working tree; no commit, release, service or hook installed. The existing global adrkit command was initially the old registry installation; `npm link --ignore-scripts` now points it at this checkout, so refreshed local skills can use the new flags.

## Automated checks

- `npm test`: 23 files passed; 440 tests passed and 1 environment-dependent shell test skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed; exercised both `node bin/adrkit.js` and the linked `adrkit` command with `relevant --base HEAD`, `relevant --staged`, and base-aware validation on this repository.
- Retrieval/glob focused run: 27 tests passed, including real Git rename/deletion, staged/unstaged/untracked, ignored files, unborn index, exact base, nested ADR root, unusual filenames and literal file inputs. Incomplete directory tests preserve useful matches and assert CLI exit 1. Deterministic filesystem mocks simulate read failures; they do not claim to measure operating-system permission handling on every platform.
- Integration/docs/commands run: 129 tests passed, 1 skipped, including init/update delivery to both `.agents` and `.claude` and byte-exact canonical skills.
- `npm run check:upstream`: passed at 95249b0b49782349740fd9b8c6ce32b4e59e497a using existing gh credentials. First unauthenticated attempt returned HTTP 403; no pin or vendored file was changed.
- `node bin/adrkit.js validate --all` and `--base HEAD`: passed before ADR promotion; repeated after the final record edits.
- `openspec validate add-change-context-and-evidence-workflows --strict` and `git diff --check`: passed before final closeout; repeated on final artifacts.

## Design and record coherence

ADR 23 extends ADR 22 rather than superseding it; the older active record links the extension. ADRs 20/21 retain inventory reading and cheap notes. Existing provenance, genuine alternatives, lifecycle, sealed archives and grill visualization separation remain intact. The evidence workflow guidance is mirrored and installed; it is not a mechanical validator of rationale truth or a measured model-obedience improvement.

Git base input compares the selected commit directly, not a merge-base. It includes non-ignored untracked files; callers choose their intended review base. Staged input uses only the index. Neither input substitutes for planned scope at task start. An unscoped record count is advisory; incomplete directory acquisition causes a nonzero exit. All three active postures remain visible, and archived files are not parsed by relevant.

## Limits

This change ships the first two implementation batches. It does not add model providers, automatic session ingestion, JSON output, MCP, CI comments or executable ADR rules. No same-model effectiveness benchmark was run: tests prove deterministic retrieval and delivered instructions, not that any model follows those instructions. The earlier research artifacts and PDF are preserved unchanged.

## Review corrections

A 2026-10-14 pre-commit review corrected one claim: the `globMatches` comment had attributed the full-match equality check to a trailing-newline allowance of the JavaScript `$` anchor that does not exist (`/^x$/.test('x\n')` is false; that allowance is Python semantics). Dot-all remains the actual newline-filename fix; the equality check stays as an explicit full-path-match contract. No behavior or test changed. `/output/` is now git-ignored so the research PDF stays local without noise in `git status`.
