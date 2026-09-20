## Why

ADR 3 shipped a required `raised-by` field alongside `decided-by` and an
optional `## Deliberation` appendix rendered by `adrkit tree`, but the live
OpenSpec specs still describe the pre-0.9.0 model: `decision-provenance` has no
`raised-by` and still says the nuance about who proposed lives in the body, and
nothing covers the tree renderer. The specs must match the shipped behavior.

## What Changes

- Modify the `decision-provenance` capability: add the required `raised-by`
  field, its declaration, lifecycle, and validation; the two axes are
  independent. No behavior changes — the code already does this.
- Add a new `deliberation-tree` capability: the optional `## Deliberation`
  design-tree appendix and the `adrkit tree` renderer.
- Correct the `decision-provenance` Purpose so "who proposed" is no longer
  described as body-only.

## Capabilities

### New Capabilities
- `deliberation-tree`: the optional design-tree appendix on a decision and the `adrkit tree` renderer.

### Modified Capabilities
- `decision-provenance`: a required `raised-by` field orthogonal to `decided-by`, plus the updated draft, validation, and documentation requirements.

## Impact

- `openspec/specs/decision-provenance/spec.md`, `openspec/specs/deliberation-tree/spec.md`.
- No source, schema, template, or dependency changes.
