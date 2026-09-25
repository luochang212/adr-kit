---
status: implemented
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-25
commit: f398955
---

# ADR: 20 Define the four lifecycle folders as a context contract

## Problem

ADR 18 adopted four lifecycle folders and ADR 19 sealed the archive, but the
folders are defined only as lifecycle states, never by what they are worth to a
task. The reading rule already treats them differently — read relevant
implemented records in full, check proposed and rejected records, consult
archived only for history — yet that priority lives in prose spread across
AGENTS.md and the skills, not in the folder contract itself.

`rejected/` is the sharpest failure. It retains every formal rejection forever,
so it grows without bound and buries the records that still warn against a
tempting mistake under ones that no longer teach anything. An agent checking
rejected records cannot tell which are the live bad cases. `archived/` is
frozen and lowest value, but nothing states "do not read by default". The
folder model is structurally correct yet does not do its main job: keeping
low-value material out of the working context.

## Decision

Treat the four folders as one contract with two axes — intent (why the record
exists) and context value (whether a task should read it) — and state the
reading policy per folder:

- `implemented/` — current authority. Read the relevant records in full.
- `proposed/` — intent. Check the relevant proposals for work still being shaped.
- `rejected/` — anti-pattern memory. Check the relevant bad cases.
- `archived/` — lowest-value frozen history. Consult only when a task explicitly
  cites history; never as current authority and never by default.

Redefine `rejected/` from "every formal rejection retained" to anti-pattern
memory: a rejected proposal is kept only while its rationale still prevents a
tempting, meaningful mistake; once that mistake is no longer plausible, or a
better record owns the warning, delete the record. Its `reason` exists to name
the tempting mistake it blocks. Deletion costs nothing here because rejected
records are unnumbered and unsealed: removing one cannot reuse an ADR number or
break the archive manifest.

Keep `archived/` exactly as ADR 19 built it — frozen, sealed, never edited — and
only make its reading posture explicit. Keep the stable numbers, the
`superseded` status, the archive seal, and the `tags` classification unchanged.
This is a definition and reading-policy change, not a structure change: no new
folder, no new field, no new status, no code behavior change.

Bind the policy into the surfaces an agent actually reads: this repository's
AGENTS.md, the generated `adr/README.md`, the standing-orders template, and the
`adrkit-*` skills that create, retire, or review records. This partially
replaces ADR 18 and ADR 19's "retain every formal rejection" clause; both
records stay active and link to this one.

## Alternatives considered

- **Keep "retain every formal rejection"**: rejected. It grows `rejected/`
  without bound and buries the instructive bad cases, so the folder cannot be
  used as a warning list. Rejections are unnumbered and unsealed, so pruning
  costs none of the guarantees that make retention necessary for numbered
  history.
- **Discard every rejection at the moment of rejection**: rejected. A
  rejection's whole value is the temptation it blocks; dropping it immediately
  loses the anti-pattern memory the folder exists for.
- **Add a `value:` field to each record**: rejected. Value is a property of a
  folder's role, not of an individual record; a field would need to be kept in
  sync with the folder and would add vocabulary without changing behavior.
- **Adopt DSH's deletion of fully superseded implemented notes**: rejected.
  Implemented records carry stable numbers and are sealed on archive; deleting
  one breaks number stability and the append-only manifest. Only unnumbered,
  unsealed rejections can be pruned.
- **Make `archived/` deletable or re-readable**: rejected. ADR 19 freezes
  archived bytes and `validate --base` proves the archive only grows; the right
  posture is "do not read by default", not "delete".
- **Add the class/area second path axis now**: rejected here. It is orthogonal
  to this decision, and adding an unexercised taxonomy on top of folders that
  are not yet fully used would be speculative. Tags remain the thematic
  classification.

## Consequences

### Acceptance criteria

- `adr/README.md`, this repository's AGENTS.md, the standing-orders template, and
  every affected `adrkit-*` skill state the per-folder reading policy and the
  rejected pruning rule.
- `rejected/` is described and used as anti-pattern memory: a rejection's reason
  names the tempting mistake it blocks, and a rejection is deleted once it no
  longer teaches.
- `archived/` is described as lowest-value frozen history and "not read by
  default" everywhere it is mentioned.
- No code behavior changes: `adrkit reject`, `adrkit validate`, the archive seal,
  and the `superseded` status are unchanged; `npm test` and
  `node bin/adrkit.js validate --all` pass.
- ADR 18 and ADR 19 stay active and each links to this record as a partial
  replacement.

### Risks

- **Pruning a rejection that still teaches.** The deletion is a judgment call
  with no mechanical check. Mitigation: keep the bar narrow — delete only when
  the mistake is no longer plausible or another record owns the warning — and
  require the reason to name the mistake.
- **An agent deleting rejections to look tidy.** Mitigation: the skill states
  the bar, and Git keeps a deleted record recoverable.
- **The reading policy drifting from the folder model.** Mitigation: the policy
  lives in the folder contract (AGENTS.md, `adr/README.md`, the skills), and
  `test/docs.test.ts` pins the wording.
- **Giving up "retain every rejection" loses durable history.** Mitigation: the
  record only removes rejections that no longer warn; a rejection that still
  carries a live warning is retained, and any deleted one remains in Git.

