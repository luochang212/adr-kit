# Proposal

## Why

Three unreleased commits replaced the old ADR model — a single `accepted`
status, the `decide`/`accept` commands, and the `adr/decisions/` plus
`adr/.drafts/` folders — with a four-folder lifecycle (`proposed/`,
`implemented/`, `rejected/`, `archived/`) and the `record`/`implement`
commands. Only `record-lifecycle`'s main spec was reconciled; the remaining
main specs still describe the removed `decide`/`accept`/`accepted`/draft
model, so the published specification contradicts the shipped CLI. One
behavioral tightening to the archive contract also needs to be specified.

## What Changes

- Reconcile the six main specs that still describe the removed model
  (`cli-option-surface`, `decision-provenance`, `decision-graph`,
  `validation-integrity`, `record-lifecycle`, `deliberation-tree`):
  `decide`→`record`, `accept`→`implement`, `accepted`→`implemented`,
  `draft`/`drafts`→`proposal`/`proposed` where those name the lifecycle
  state, and `adr/decisions/`→`adr/implemented/`.
- Preserve `decision-provenance`'s actual contract while replacing the stale
  surfaces: proposals carry no provenance fields, and only entry to
  `implemented/` records `raised-by`/`decided-by`, always as a caller
  declaration and never an inference. Correct the retired claim that
  `adrkit validate` ignores proposals; validation now covers all four
  lifecycle directories.
- Correct `decision-graph`: the graph reads numbered decisions in
  `implemented/` and `archived/`, excludes unnumbered `proposed/` and
  `rejected/` records, and renders a retired non-superseded archived record
  with the same dashed/gray styling as a superseded one.
- Tighten `archive-integrity`: every repository SHALL carry a valid
  `adr/archived/MANIFEST.json` even when the archive is empty, and repository
  validation SHALL report a missing manifest as an error. Base-aware
  validation SHALL distinguish an absent base manifest (no prior seals) from a
  manifest path that exists at the base but cannot be read, failing with an
  actionable error that names the ref.

## Capabilities

### New Capabilities

- None. This change only reconciles existing behavior contracts; no new
  capability is introduced.

### Modified Capabilities

- `cli-option-surface`: rename the `decide` scenario/command to `record`.
- `decision-provenance`: replace the removed `decide`/`accept`/`accepted`/draft
  surfaces, keep proposals provenance-free, and state that validation covers
  all four lifecycle directories.
- `decision-graph`: read numbered decisions from `implemented/` and
  `archived/`, exclude `proposed/` and `rejected/`, and render retired
  records dash/gray.
- `validation-integrity`: replace `adr/decisions/` paths with
  `adr/implemented/`.
- `record-lifecycle`: replace the leftover "accepted decision"/"accepted
  replacement" wording with "implemented".
- `deliberation-tree`: replace the leftover "accepted decision" scenario
  wording with "implemented decision".
- `archive-integrity`: require a valid manifest even for an empty archive and
  distinguish an absent base manifest from an unreadable one.

## Impact

- Specification text only for six capabilities; no source change results from
  the rename reconciliation beyond what already shipped.
- `archive-integrity` implies two code changes: `adrkit validate` must report
  a missing `adr/archived/MANIFEST.json` even when the archive is empty, and
  the `--base` check must distinguish an absent base manifest from an
  unreadable one. `adrkit init` already writes the empty manifest, and
  `archive`/`supersede` already require it, so those paths only gain tests
  and documentation.
- Affects `src/core/validate.ts`, `src/core/repository.ts` (init) and the
  archive/base reader, their command tests, and the README/docs that describe
  validation and the manifest.
