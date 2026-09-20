## Context

See proposal.md - Why. `adrkit graph` mines references with
`REFERENCE_PATTERN = /ADR-?\s*([1-9]\d*)/g` (`src/core/graph.ts:37`) and
drops those that do not resolve (`graph.ts:93`). `validate` checks only
`superseded-by` (`src/core/validate.ts:294`).

## Goals / Non-Goals

**Goals:**
- Fail validation when a body reference has no matching decision.

**Non-Goals:**
- Changing graph's mining or edge rules; bidirectional supersede; warnings.

## Decisions

- **Reuse the graph pattern verbatim.** One reference vocabulary, no second
  regex to drift.
- **Exclude the title line.** `# ADR: N <title>` is the record's own number.
- **Hard failure, not a warning.** `validate` is the format gate and CI runs
  it; a dangling cross-reference is a format defect. It can be downgraded later
  if it proves too strict.
- **Check in `validateRecordReferences`**, which already receives the full
  record list and is shared by `validate --all` and `validate <name>`.
- **Allow self-reference.** `graph` already ignores a record's self-reference;
  the validator follows the same rule.

## Risks / Trade-offs

- [A body legitimately mentions a number that is not a reference] -> the pattern
  matches `ADR-N`/`ADR N`; prose about numbering is rare in record bodies.
  A false positive can be suppressed with an explicit marker in a follow-up.
