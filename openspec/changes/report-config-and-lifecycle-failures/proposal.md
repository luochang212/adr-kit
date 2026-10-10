# Proposal

## Why

ADR Kit silently ignores wrongly typed configuration fields while validation reports success. Archive operations can also seal a record successfully and then fail to remove its active source, leaving duplicate decision numbers without explaining the completed steps or recovery.

## What Changes

- Report invalid types for known configuration fields, including the exact field or rules-list item, through repository validation.
- Keep absent optional fields, unknown keys, and advisory rule content compatible; preserve tolerant task-start commands.
- Report partial completion of `archive` and `supersede` when the archived file and seal exist but deleting the source fails. Identify both paths and explain recovery without modifying sealed history.
- Add focused regression tests and bilingual CLI documentation. Successful command behavior remains unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `validation-integrity`: Known configuration fields with invalid types cannot silently pass repository validation.
- `archive-integrity`: Post-seal source-removal failures report the retained state and actionable recovery.

## Impact

Configuration parsing and validation in `src/core/config.ts` and `src/core/validate.ts`; archive and supersede commands; focused tests in `test/`; `docs/cli.md` and `docs/zh/cli.md`. No runtime dependencies, new CLI flags, generic diagnostic framework, transactions, or automatic recovery.

The worth-fix review reproduced invalid `workflows`, `context`, and mixed-type `rules` values returning validation OK. A temporary-repository fault injection into source deletion reproduced two copies of ADR 1, a valid archive seal, a duplicate-number validation error, and an ambiguous retry. The supersede branch has the same write/seal/remove ordering but still needs its own regression reproduction.

This supplements ADR 19's archive guarantees; it does not change the sealing policy or require a new ADR.
