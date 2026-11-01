---
status: implemented
date: 2026-11-02
description: "Read when changing what the pre-commit hook blocks on staged deletions, or how literal paths scopes stay truthful."
raised-by: agent
decided-by: human
created: 2026-11-02
paths:
  - src/core/hook.ts
  - test/hook.test.ts
  - README.md
  - README.zh.md
  - docs/cli.md
---

# ADR: 50 Fail the pre-commit hook on deletions that strand a literal record scope

## Problem

ADR 22 gave `adrkit validate` a drift check so a record scoped to a deleted or
renamed path fails instead of silently stranding its citations, and ADR 32 put
a pre-commit hook at the commit boundary. The two never met: the hook
validates only staged record files, and a staged deletion of any other file
has no index text, so the hook skipped it entirely. Deleting a file that a
record's literal `paths:` entry names — the exact scenario ADR 22's check
exists for — passed the hook silently while `adrkit validate` on the same tree
failed (reproduced 2026-11-01 with `hookCheck` passing and `validateCommand`
failing on one repository). Repositories with CI caught the drift at push
time; a clone without it could carry a false scope indefinitely, all while
the hook printed the governing record's name in its advisory output without
checking that the scope still resolved.

## Decision

The hook hard-fails a staged deletion when the deleted path is itself a
`paths:` entry of a record in the working-tree inventory — literal string
equality, so the check cannot fire on a glob: an entry containing a wildcard
can never equal a real path, and a glob scope legitimately keeps governing the
files that remain. All four lifecycle folders are checked, matching
`validate`: an archived record stranded by a deletion is fixed in the same
commit as the normal migration it already is. A record staged in the same
commit is excluded from this check, because `validateRecord` on its staged
text already reports the same drift once. The passing remedy is the rename
flow: update the record's `paths` in the same commit, exactly as ADR 47's
stranding checks demand for deleted records.

## Alternatives considered

- **Also flag deletions matched only by glob entries**: rejected. A glob scope
  survives the loss of individual files by design; only anchor-level
  extinction is drift, and that is `validate`'s to catch. Counting matches
  would make the hook guess at intent.
- **Rely on `validate` alone (the status quo)**: rejected. It detects the
  drift but nothing runs it at the commit boundary; hook-installed clones kept
  committing strandings, and adopters without CI could drift indefinitely.
- **Teach `adrkit init` output or the standing orders to remind about the
  hook or about running `validate` after deletions**: rejected. Init output is
  one-shot, the standing orders already carry "keep required paths and
  references valid", and the hook now enforces that duty mechanically where
  the mechanism exists — reminder text would add template-sync cost for no
  added check.

## Consequences

### Verification

- `test/hook.test.ts` proves both sides: a staged deletion of a literally
  named file fails with the record and path spelled out; a deletion only a
  glob entry matched passes; a deletion whose record is updated in the same
  commit passes; and a record staged with the stale entry reports the drift
  once through the validate path, not twice.
- The bilingual READMEs and `docs/cli.md` name the new failure class; the
  same edit corrects their pre-ADR-47 claim that any staged deletion of a
  numbered decision is blocked.

### Trade-offs

- Hooks stay per-clone and opt-in (ADR 32): clones without the hook get no
  commit-time gate, and `validate` remains their backstop — the check widens
  nothing for them.
- Deleting a file a record names literally now demands a same-commit record
  edit. That is the burden the `paths` claim itself imposes; `git commit
  --no-verify` remains the deliberate escape hatch.
