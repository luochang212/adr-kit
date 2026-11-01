---
status: implemented
date: 2026-11-01
description: Read when removing a record that should never have been written, or
  changing how the CLI and the pre-commit hook treat record deletion.
raised-by: human
decided-by: human
created: 2026-11-01
commit: 84f2dec
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
decision, a duplicate, noise — has no first-class exit. The three lifecycle
commands do not fit: `reject` means "this direction was declined" and demands
substantive content a noise record does not have; `archive` means "this
decision once governed and now retires", permanently publishing the record in
the atlas and keeping it under validation; manual `git rm` is legal but
unchecked, and the maintainer's real fear is deleting incompletely — stranding
a citation, a prose reference, or a mention and only discovering it later.

ADR 20 settled "never delete a numbered decision" as a deliberate divergence
from pruning, on the ground that deleting one breaks number stability. That
rule was written for a world where the only removal tool was the filesystem.
Today the retirement commands already prove the model can move records safely:
ADR 46's preflight refuses any move that would strand `@adr` citations. The
mistaken-record case is left to manual Git surgery with the pre-commit hook as
the only checkpoint, which is exactly the burden an agent feels as "I am
afraid of deleting this uncleanly".

## Decision

Add `adrkit delete <name>`: a checked removal for a record that should not
exist, positioned as neither a lifecycle stage nor a retirement. The design
keeps ADR 20's invariant by relocating it: deletion is no longer forbidden,
it is permitted only through a path that refuses to strand references.

- The command removes the record file from `proposed/`, `implemented/`, or
  `rejected/`. `archived/` records are refused: frozen history stays frozen,
  per ADR 20.
- Before removing a numbered record, the command scans the same corpus
  validation reads (ADR 46's definition of the repository) and refuses while
  anything references it: `@adr N` citations in code, `superseded-by: N` in
  any record's front matter, and the visible-prose reference vocabulary
  (`ADR N`, `ADR-N`) in any other record body. Each refusal lists the exact
  `path:line` or record, so the caller can clean up and re-run.
- Mentions the CLI cannot verify — `AGENTS.md` and `adr/notes.md` — are
  reported as advisory output, never rewritten: those files are user-owned.
- Deleting a rejection prints a loud reminder of ADR 20's rule: a rejection
  is durable and leaves only when another record owns its warning. The check
  is judgment, so it warns instead of refusing.
- Numbers are assigned by `nextDecisionNumber` and stay monotonic over the
  surviving inventory; deleting the highest number frees it, which the
  trade-offs below accept explicitly.
- The pre-commit hook stops hard-failing every staged deletion of a numbered
  decision. It hard-fails only when the deleted number still has stranded
  references in the working tree — an objective defect, matching ADR 32's
  "objective defects only" bar — and points at `adrkit delete` otherwise.
  A deletion that went through the command passes the hook; a manual `rm`
  that stranded something still fails, with the list.
- The generated `adr/README.md` text ("Never delete a numbered decision") is
  rewritten to name `adrkit delete` as the checked path and Git history as
  the memory of what was removed (ADR 30: history is Git's job).

The command reuses ADR 46's refusal pattern and `citationsTo`; the prose scan
reuses the exact reference vocabulary validation's `danglingReferenceIssues`
mines, so a deletion that passes `delete` cannot fail the next `validate` on
a dangling reference.

## Alternatives considered

- **Keep manual `git rm` as the only path**: rejected. It is the status quo
  the maintainer is afraid of: no preflight, discovery of stranded references
  deferred to a later validate, and the hook blocking with no suggested fix.
- **Archive mistaken records instead**: rejected. Archive asserts the record
  once governed; it permanently publishes the noise in the atlas (ADR 31) and
  keeps it under validation forever. Retirement and erasure are different
  claims and need different commands.
- **Reject mistaken records**: rejected. A rejection is a durable record of
  a declined direction with required substance; forcing noise through it
  manufactures anti-pattern memory that blocks nothing.
- **Cascade-clean references automatically** (delete N and rewrite every
  record and citation that names it): rejected. A citation is a claim the
  code owner makes (ADR 46), and rewriting another record's prose silently is
  exactly what the standing orders forbid. The command refuses and reports
  instead; the caller decides how each reference should change.
- **Tombstone records to keep numbers from ever being reused**: rejected.
  A tombstone is a permanent record kept only to hold a number — the noise
  problem re-created one level down. The preflight guarantees the repository
  carries no reference at deletion time; that is the guarantee worth keeping.

## Consequences

### Verification

- `adrkit delete <name>` removes proposed, implemented, and rejected records
  and reports what it removed; the command is registered in the CLI surface
  (`src/core/cli-options.ts`, the help synopsis), `docs/cli.md`,
  `docs/zh/cli.md`, both READMEs, `site/public/llms.txt`, and the generated
  `adr/README.md` text.
- A record cited by code, referenced in another record's prose, or named by
  another record's `superseded-by` cannot be deleted; the error lists every
  stranded reference, and after cleaning them the same command succeeds.
- An archived record is refused. Deleting a rejection carries the
  durable-warning reminder in its output.
- The pre-commit hook passes a staged deletion whose number nothing
  references, and fails one that strands a citation or prose reference,
  listing it; a staged deletion of an archived record still fails.
- `adrkit validate --all` passes after every successful delete; the delete
  tests assert validity after each removal, so no test observes a delete
  followed by a validation failure.

### Trade-offs

- **A freed number can be reassigned.** Deleting the highest number lets the
  next decision take it; prose outside the scanned corpus (commit messages,
  chat logs) may still name the old record. Accepted because the preflight
  guarantees the repository itself carries no reference, and the natural
  moment to delete a mistake is before anything builds on its number.
- **Deletion becomes easy, so selection discipline (ADR 45) erodes.**
  Mitigation: the command refuses stranded references, warns on rejections,
  and the generated README keeps the selection guidance next to the deletion
  instructions; Git history still shows the removed record and who removed it.
- **The hook's deletion check weakens from "any deletion fails" to "only
  stranded deletions fail".** A manual `rm` whose references were cleaned by
  hand now passes the hook. Accepted: the hook's bar is objective defects
  (ADR 32), and a reference-free deletion has none; `adrkit delete` remains
  the path that produces the report.

### Later changes

**Amended by ADR 48:** the trade-off above that accepted reuse of the highest
freed number is withdrawn — decision numbers form an append-only journal
(`adr/.decision-sequence`) that removals also append to, so allocation behaves
identically with or without deletions. The preflight and refusal design of
this record stand unchanged.

