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

`rejected/` had no principled terminal. The borrowed rule — keep a rejection
only while it still teaches, otherwise delete it — rests on a subjective,
unverifiable judgment, and it is the only place the model deletes a record at
all. `archived/` is frozen and lowest value, but nothing stated "do not read by
default". The folder model is structurally correct yet does not do its main
job: keeping low-value material out of the working context, while the one
folder that holds our anti-patterns wobbles on a feeling.

## Decision

Treat the four folders as one contract with two axes — intent (why the record
exists) and context value (whether a task should read it) — and state the
reading policy per folder:

- `implemented/` — current authority. Read the relevant records in full.
- `proposed/` — intent. Check the relevant proposals for work still being shaped.
- `rejected/` — anti-pattern memory. Check the relevant bad cases.
- `archived/` — lowest-value frozen history. Consult only when a task explicitly
  cites history; never as current authority and never by default.

`rejected/` is a durable terminal record of a declined proposal: keep it as
the record of why a tempting direction was declined, and do not remove it for
being old, brief, or currently quiet. Its `reason` names the tempting mistake
it blocks. The only exit is replacement: when another record owns that warning
— a newer decision, or a sharper rejection — the old rejection is redundant
and may be removed, with the owner preserving any unique rationale first. That
is a deliberate, reviewed edit, not automatic pruning.

Keep `archived/` exactly as ADR 19 built it — frozen, sealed, never edited —
and only make its reading posture explicit. Keep the stable numbers, the
`superseded` status, the archive seal, and the `tags` classification unchanged.
This is a definition and reading-policy change, not a structure change: no new
folder, no new field, no new status, no code behavior change.

Bind the policy into the surfaces an agent actually reads: this repository's
AGENTS.md, the generated `adr/README.md`, the standing-orders template, and the
`adrkit-*` skills that create, retire, or review records. This refines ADR 18's
rejection retention and ADR 19's archive rules; both records stay active and
link to this one.

## Alternatives considered

- **Delete a rejection once it no longer teaches** (the borrowed rule):
  rejected. The judgment is subjective and unverifiable, and it is the only
  deletion path in a model that otherwise keeps every record; it risks losing
  the anti-pattern for a tidier-looking folder. Retention costs almost nothing.
- **Discard every rejection at the moment of rejection**: rejected. A
  rejection's whole value is the temptation it blocks; dropping it immediately
  loses the anti-pattern memory the folder exists for.
- **Add a `value:` field to each record**: rejected. Value is a property of a
  folder's role, not of an individual record; a field would need to be kept in
  sync with the folder and would add vocabulary without changing behavior.
- **Adopt DSH's deletion of fully superseded implemented notes**: rejected.
  Implemented records carry stable numbers and are sealed on archive; deleting
  one breaks number stability and the append-only manifest. Only unnumbered,
  unsealed rejections can be removed, and only when another record owns them.
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
  every affected `adrkit-*` skill state the per-folder reading policy and that
  `rejected/` is a durable terminal retained until another record owns its warning.
- `rejected/` is described and used as anti-pattern memory: a rejection's reason
  names the tempting mistake it blocks, and the record is not removed for
  appearing stale.
- `archived/` is described as lowest-value frozen history and "not read by
  default" everywhere it is mentioned.
- No code behavior changes: `adrkit reject`, `adrkit validate`, the archive seal,
  and the `superseded` status are unchanged; `npm test` and
  `node bin/adrkit.js validate --all` pass.
- ADR 18 and ADR 19 stay active and each links to this record.

### Risks

- **A rejection lingers after its warning is owned elsewhere.** Mitigation: the
  owner records the replacement and the redundant rejection is removed in that
  deliberate edit; `adrkit list` groups rejections, so they stay visible.
- **A large rejection list dilutes relevance.** Mitigation: agents read the
  relevant rejections, and the removal bar is "another record owns the warning",
  not staleness; `list` groups by folder.
- **The reading policy drifting from the folder model.** Mitigation: the policy
  lives in the folder contract (AGENTS.md, `adr/README.md`, the skills).
- **Giving up DSH's pruning.** Mitigation: this is a deliberate divergence, like
  never deleting a numbered decision; Git still records a removed rejection.
