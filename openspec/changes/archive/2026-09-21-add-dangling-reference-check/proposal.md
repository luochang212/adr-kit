## Why

`adrkit graph` mines cross-references (`ADR-N`, `ADR N`) from record bodies
and keeps only those that resolve to a node (`src/core/graph.ts:37`,
`graph.ts:93`), and `adrkit validate` checks only the `superseded-by`
front-matter reference (`src/core/validate.ts:294`). A body naming a decision
number that does not exist therefore produces no graph edge and no validation
issue: a silent dead link in a record that is immutable afterwards. Verified: a
record body naming `ADR-99` passes `adrkit validate --all`.

## What Changes

- `adrkit validate` reports a record whose body references a decision number
  that does not exist.
- The reference vocabulary is the one `adrkit graph` already mines; a record's
  own title number is not a reference.
- No change to graph mining, edge rules, or the front-matter format.

## Capabilities

### New Capabilities
- `reference-integrity`: a record's body references to other decisions resolve.

### Modified Capabilities
<!-- None. -->

## Impact

- `src/core/validate.ts`, `test/validate.test.ts` (or `test/graph.test.ts`),
  `docs/record-format.md` and `docs/zh/record-format.md`.
- Behavior change: a repository with a dangling body reference fails
  `adrkit validate`.
