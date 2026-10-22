---
status: implemented
date: 2026-10-22
raised-by: human
decided-by: human
created: 2026-10-22
commit: 147b36a
tags: [agent-integration, governance, capture]
paths:
  - src/core/hook.ts
  - src/commands/hook.ts
  - src/core/markers.ts
  - src/core/cli-options.ts
  - src/cli.ts
  - test/hook.test.ts
  - docs/cli.md
  - docs/zh/cli.md
  - README.md
  - README.zh.md
---

# ADR: 32 close the deferred task-end self-check in favor of a commit-time hook

## Problem

ADR 17 (2026-09-24) evaluated a task-end self-check — "did this task settle a
choice future work must live with?" — and deferred it behind an evidence gate:
if the next two or three OpenSpec archives showed a decision-inventory action,
the standing-orders sentence would go in; two silent archives would falsify the
channel. ADR 21 (2026-10-12) recorded the gate closed positive: three archives,
three inventory actions, zero falsifying traces. The sentence was never added,
and ADR 21 explicitly refused to fold it in, so a conditional decision whose
condition had been met sat unexecuted for ten days.

Re-examination shows the gate was not clean. It measured behavior at OpenSpec's
archive step, in this one repository, and concluded something about the end of
an ordinary coding task in any repository: a different moment, a different
trigger, and a different framework. Spec frameworks are many, and co-designing
the capture pipeline with any one of them is not a product surface.

The underlying gap is real: an unrecorded decision produces no failure signal,
because `validate` rejects records written badly and never records never
written. But the proposed remedy — a sentence every agent reads at the end of
every task — taxes every task for a behavior no local test can measure, and
prose carries no enforcement.

## Decision

- Close ADR 17's deferred sentence instead of shipping it. ADR 17 is superseded
  by this record; no task-end sentence is added to the standing orders.
- Use the commit boundary as the check-in point. `adrkit hook install` writes an
  opt-in pre-commit hook. It hard-fails only on objective defects in the staged
  set: an invalid staged record, or an `@adr` citation naming a missing,
  archived, or superseded decision or sitting outside that decision's `paths`.
  It reads the staged blob, not the working tree. Otherwise it reports which
  active decisions govern the staged files and prompts the committer to update
  those records or to record or park a choice the change settles. It never
  fails because no record was written.
- State the limit plainly: the hook cannot observe whether a choice was
  settled, so it does not claim to detect a missing record. That judgment stays
  with the committer or agent. A blocking commit-msg declaration
  (`ADR: none` / `ADR: 31`) is rejected for now; it would turn a judgment into
  a ritual.
- OpenSpec stays outside the runtime and governance design: no capture
  mechanism depends on a spec framework.
- This record changes neither the always-record rule for grilling sessions
  (ADR 4) nor the settle-moment note buffer (ADR 21). It replaces only
  ADR 17's deferred mechanism.

## Alternatives considered

- **Ship the deferred sentence, as ADR 17 was written**: rejected. Its evidence
  came from a different moment and one framework, its cost falls on every task,
  and prose has no enforcement.
- **Re-run the experiment under another spec framework or a second
  repository**: rejected. It would still measure the framework's prompt, not
  whether an agent notices a settled choice at task end.
- **Keep the open loop**: rejected. A condition met with its action absent is
  exactly the drift the record set exists to prevent.
- **Enforce a commit-msg trailer now**: rejected for now. Declaration degrades
  into a habitual `none`; revisit only if real commits show the advisory
  ignored.
- **Heuristic blocking ("a CLI option changed, so a record is required")**:
  rejected. False positives teach `--no-verify`, which also disables the
  objective checks.
- **A CI-only check**: rejected. It runs after the decision to commit and still
  cannot see intent; the value is at the moment the diff is in hand.

## Consequences

### Verification

- `adrkit hook install|uninstall|run` exist; install refuses to replace a hook
  adr-kit does not manage, and uninstall leaves one untouched.
- `test/hook.test.ts` proves both sides: an invalid staged record fails, a
  staged citation to a missing decision fails, and a citation fixed in the
  working tree but still staged fails; a valid set passes and names the
  governing decision and the prompt; a CLI run sets a failing exit code;
  outside an ADR repository or with nothing staged the hook stays silent.
- The installed script was exercised end-to-end in a throwaway repository: a
  bad record blocked `git commit`, and the corrected record committed with the
  advisory output.
- `npm test`, `npm run typecheck`, `npm run build`, and `adrkit validate --all`
  pass; ADR 17 is archived and names this record as its successor.

### Trade-offs

- Hooks are per-clone; teams need `core.hooksPath` or a setup step. Opt-in
  keeps the hook from surprising anyone.
- The hook sees the diff, not the reasoning. It narrows the moment when a
  missing record can be noticed; it does not close that gap.
- Every commit prints a few lines. The output is bounded and names only the
  decisions that actually govern the staged files.
- `git commit --no-verify` bypasses the objective checks. That is deliberate: a
  gate people cannot escape gets disabled wholesale.
- Windows relies on Git for Windows' POSIX shell; the script is plain `sh`.
