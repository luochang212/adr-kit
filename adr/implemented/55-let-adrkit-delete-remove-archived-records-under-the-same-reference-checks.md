---
status: implemented
date: 2026-11-15
description: "Read when deleting archived records, changing the pre-commit hook's deletion checks, or editing the generated adr/README.md's deletion and record-worthiness wording."
raised-by: agent
decided-by: human
created: 2026-11-15
paths:
  - src/commands/delete.ts
  - src/core/hook.ts
  - src/core/repository.ts
  - README.md
  - README.zh.md
  - docs/cli.md
  - docs/zh/cli.md
  - test/commands.test.ts
  - test/hook.test.ts
---

# ADR: 55 Let adrkit delete remove archived records under the same reference checks

## Problem

The frozen-archive refusal had three observed costs, one of them structural:

- In a consuming repository's 2026-11 regrade, nineteen archived records were
  removed with raw `rm` because the command refused them and the generated
  README forbade the move; the tool was bypassed exactly where it should have
  been the safe path, and its own pre-commit hook would have blocked the
  legitimate cleanup.
- Kept archives rot against a live tree: validation requires an archived
  record's `paths` to name files that exist, so every rename or deletion in
  active code can break the check for records nobody reads. Keeping archives
  forever is not free; it is an ongoing validation liability.
- The generated `adr/README.md` said "Never delete a numbered decision" while
  ADR 47 shipped the checked deletion command — the documentation contradicted
  the tool at the exact moment a regrade needed direction.

## Decision

`adrkit delete` now removes archived records under the same preflight as
numbered ones: it refuses while `@adr` code citations, `superseded-by` fields,
or visible prose in other records still reference the number, and Git history
keeps the removed bytes. The pre-commit hook drops its hard failure for staged
archived deletions and checks them for stranded references exactly like
numbered ones. ADR 47's refusal list shrinks by one entry; its preflight
design stands unchanged, as does ADR 20's durable-rejection rule for
`rejected/`.

The generated `adr/README.md` is rewritten in the same change: the deletion
paragraph states the record-worthiness bar (a record earns its reading cost by
vetoing work; a record that vetoes nothing is bookkeeping — delete it rather
than archive it), names `adrkit delete` as the only deletion path with
archived records included, and keeps the append-only number journal as the
invariant that makes deletion safe. The hooked, documented, and CLI-reference
wording follows the same semantics, and the regrade procedure in the workflow
guide (ADR 54) names deletion as the below-line outcome.

## Alternatives considered

- **Keep the freeze and exempt archived records from path validation**:
  rejected. It hides the rot instead of removing it and splits validation into
  two rules for records that are checked "like the rest of the inventory".
- **Delete automatically on archive or supersede**: rejected. Retirement and
  removal are different judgments — archive asserts the record once governed,
  and bulk regrades must stay a deliberate per-record call, with deletion as
  the explicit below-line outcome rather than a side effect.
- **Gate archived deletion behind a config flag**: rejected. The repository
  ships breaking changes deliberately and carries no compatibility shims; a
  flag would be a shim for a rule this record replaces outright.

## Consequences

### Verification

- `adrkit delete` removes an archived record and the repository validates
  afterward (`test/commands.test.ts`); it still refuses while anything
  references the number.
- The hook passes an unstranded staged archived deletion and fails one that
  strands a citation (`test/hook.test.ts`).
- The dogfooded `adr/README.md` is regenerated from the rewritten template and
  the identity test holds; the READMEs, both CLI references, and the hook
  description state the same semantics.

### Trade-offs

- Bulk cleanup of `archived/` is now easy, so over-deletion is the new
  failure mode; the mitigation is the same one ADR 47 chose — the preflight
  refuses stranded references, the regrade procedure names deletion as the
  below-line outcome rather than the default, and Git history retains every
  removed record.
- Published atlases include archived bodies; a deleted archive disappears
  from regeneration. That is the intent — the atlas reflects the tree — but
  a reader comparing an old atlas to a new one can now see records vanish
  rather than merely move folders.
