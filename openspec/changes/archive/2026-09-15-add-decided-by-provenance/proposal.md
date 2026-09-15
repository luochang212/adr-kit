## Why

Every record's front matter carries `date` (when the current status was
reached) and `commit` (which revision it was recorded against), but nothing
that says whether a human or a machine initiated the decision. `adrkit
decide` and `adrkit accept` produce the same file shape, so a decision an
agent recorded on its own authority is indistinguishable from one a human
authorized. Identity is not the gap: git already stores who committed,
including trailers. The gap is the human-versus-machine axis, which git
cannot answer because agent sessions routinely commit as the human user.

## What Changes

- Add one canonical front matter field, `decided-by: human | machine`,
  written in canonical order between `date` and `created`.
- The value is stamped by the CLI from the executing environment at write
  time, never supplied by a caller parameter: `decide` and `accept` detect
  and stamp; `propose` writes nothing; a value hand-written into a draft is
  dropped by the promotion rewrite. `supersede` preserves the existing value
  rather than re-stamping.
- `validate` requires `decided-by` on `accepted` and `superseded` records
  and forbids it on `proposed` drafts.
- **BREAKING**: existing accepted records lack the field and fail `validate`
  until fixed. The release notes carry the migration; the CLI does not
  back-fill, because a machine inventing an origin for a past decision is
  the fabricated history this field exists to prevent.
- Document, in the record-format reference, that `decided-by` is an inferred
  environment stamp and therefore weaker evidence than the observed `date`
  and `commit`, and name what it cannot prove (cleared markers, wrappers,
  later edits).

## Capabilities

### New Capabilities

- `decision-provenance`: how a durable record states whether a human or a
  machine initiated it, how that value is stamped across the lifecycle, and
  the limits of the claim.

### Modified Capabilities

- `decision-graph`: unchanged requirements; the graph reads the same front
  matter and needs no new behavior.

## Impact

- Record format contract: `src/core/adr.ts` (canonical field order, parsed
  record), `src/core/validate.ts` (the three state rules).
- New `src/core/execution-env.ts`: the shared environment probe, kept in
  `src/core/` so it stays free of `process.argv` and directly testable.
- Lifecycle writers: `src/commands/decide.ts`, `src/commands/accept.ts`,
  `src/core/templates.ts` (both templates, `proposalToDecision`, and the
  preserve rule in `stampLifecycleMove`).
- Mirror surface that must stay in sync: the seven
  `skills/adrkit-*/SKILL.md` files, `src/core/tool-integrations.ts`, and
  `test/integrations.test.ts`.
- Documents: `README.md`, `README.zh.md`, `docs/record-format.md`,
  `docs/zh/record-format.md`, and the site copies of the record format.
- No new dependency; `yaml` remains the only runtime dependency.
