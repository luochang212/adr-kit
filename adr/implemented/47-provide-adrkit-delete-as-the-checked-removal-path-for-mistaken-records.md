---
status: implemented
date: 2026-11-01
description: Read when removing a record that should never have been written, or
  changing how the CLI and the pre-commit hook treat record deletion.
raised-by: human
decided-by: human
created: 2026-11-01
paths:
  - src/commands/delete.ts
  - src/core/hook.ts
  - src/core/repository.ts
  - src/core/validate.ts
  - src/core/cli-options.ts
  - src/cli.ts
  - src/core/tool-integrations.ts
  - AGENTS.md
  - adr/README.md
  - docs/cli.md
  - docs/zh/cli.md
  - README.md
  - README.zh.md
---

# ADR: 47 provide adrkit delete as the checked removal path for mistaken records

## Problem

A record that should never have been written — a routine change recorded as a
decision, a duplicate, noise — has no first-class exit. `reject` means "this
direction was declined" and demands substance noise does not have; `archive`
means "this decision once governed and now retires" and permanently publishes
the record in the atlas. Manual `git rm` is legal but unchecked, and the real
fear is deleting incompletely: stranding a citation, a prose reference, or a
mention and discovering it later.

ADR 20 settled "never delete a numbered decision" as a deliberate divergence
from pruning, because deleting one breaks number stability. That rule was
written when the only removal tool was the filesystem. The retirement commands
now prove records can move safely: ADR 46's preflight refuses any move that
would strand `@adr` citations. The mistaken-record case still falls to manual
Git surgery with the pre-commit hook as the only checkpoint.

## Decision

Add `adrkit delete <name>`: a checked removal for a record that should not
exist, positioned as neither a lifecycle stage nor a retirement. It keeps ADR
20's invariant by relocating it: deletion is permitted only through a path that
refuses to strand references.

- The command removes a record from `proposed/`, `implemented/`, or
  `rejected/`; `archived/` is refused because frozen history stays frozen.
- Before removing a numbered record it scans the corpus validation reads (ADR
  46's repository definition) and refuses while anything references it:
  `@adr N` citations in code, `superseded-by: N` in any record, and the
  visible-prose vocabulary (`ADR N`, `ADR-N`) in any other body. Each refusal
  lists the exact `path:line` or record, so the caller can clean up and re-run.
- Mentions the CLI cannot verify — `AGENTS.md` and `adr/notes.md` — are
  reported as advisory output and never rewritten; those files are user-owned.
- Deleting a rejection prints ADR 20's durable-warning reminder instead of
  refusing, because the judgment is not mechanical.
- The pre-commit hook stops hard-failing every staged deletion of a numbered
  decision. It fails only when the deleted number still has stranded
  references in the working tree — an objective defect under ADR 32 — and
  points at `adrkit delete` otherwise. A deletion that went through the
  command passes; a manual `rm` that stranded something still fails with the
  list.
- The generated `adr/README.md` text is rewritten to name `adrkit delete` as
  the checked path and Git history as the memory of what was removed (ADR 30).

The command reuses ADR 46's refusal pattern and `citationsTo`; the prose scan
reuses validation's own reference vocabulary, so a deletion that passes
`delete` cannot fail the next `validate` on a dangling reference.

## Alternatives considered

- **Keep manual `git rm` as the only path**: rejected. It is the status quo
  with no preflight, deferred discovery of stranded references, and a hook
  that blocks without a suggested fix.
- **Archive mistaken records instead**: rejected. Archive asserts the record
  once governed, publishes the noise in the atlas, and keeps it under
  validation forever.
- **Reject mistaken records**: rejected. A rejection is a durable record of a
  declined direction with required substance; forcing noise through it
  manufactures anti-pattern memory that blocks nothing.
- **Cascade-clean references automatically**: rejected. A citation is a claim
  the code owner makes; rewriting another record's prose silently is what the
  standing orders forbid. The command refuses and reports instead.
- **Tombstone records to keep numbers from being reused**: rejected. A
  tombstone recreates the noise one level down; the preflight guarantees no
  reference at deletion time, which is the guarantee worth keeping.

## Consequences

### Verification

- `adrkit delete <name>` removes proposed, implemented, and rejected records
  and reports what it removed; the command is registered in the CLI surface,
  help synopsis, both CLI docs, both READMEs, `llms.txt`, and the generated
  `adr/README.md`.
- A record cited by code, referenced in another record's prose, or named by
  `superseded-by` cannot be deleted; the error lists every stranded reference,
  and the same command succeeds after cleanup.
- An archived record is refused; deleting a rejection prints the durable
  warning.
- The hook passes a staged deletion whose number nothing references, fails one
  that strands a citation or prose reference, and still fails any staged
  deletion of an archived record.
- `adrkit validate --all` passes after every successful delete; the tests
  assert validity after each removal.

### Trade-offs

- **A freed number can be reassigned.** Deleting the highest number lets the
  next decision take it; prose outside the scanned corpus may still name the
  old record. The preflight guarantees the repository carries no reference,
  and the natural moment to delete a mistake is before anything builds on it.
  (ADR 48 later removes this freedom; see below.)
- **Deletion becomes easy, so selection discipline erodes.** Mitigation: the
  command refuses stranded references, warns on rejections, and the generated
  README keeps selection guidance next to the instructions.
- **The hook's deletion check weakens to stranded deletions only.** A manual
  `rm` whose references were cleaned by hand now passes; the hook's bar is
  objective defects (ADR 32), and such a deletion has none.

### Later changes

**Amended by ADR 48:** the trade-off above that accepted reuse of the highest
freed number is withdrawn — decision numbers form an append-only journal
(`adr/.decision-sequence`) that removals also append to, so allocation behaves
identically with or without deletions. The preflight and refusal design of
this record stand unchanged.
