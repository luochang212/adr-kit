## Why

The design tree is written after a grilling session, so the order the session
actually moved in is lost: ADR 3's five questions are siblings in the tree even
though round 1 settled the session entity and the provenance axes and the rest
followed. A tree that shows dependent questions as parallel says something
false. The frontier round — the set of questions the previous answers exposed —
is the missing relationship, and it can be recorded without inventing a field
outside the appendix.

## What Changes

- Add an optional `(round N)` annotation to `## Deliberation` questions,
  numbered from 1 in the order the session asked them.
- Derive a question's dependency on earlier rounds from round order, and have
  options inherit their question's round.
- Render per-round subgraphs in `adrkit tree` for records that annotate
  rounds; records without annotations render as before.
- Record the rounds of a new grilling session as it runs, in the
  `adrkit-grill` skill.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `deliberation-tree`: the grammar gains `(round N)`, and rendering gains
  per-round grouping.

## Impact

- `src/core/deliberation.ts`, `src/commands/tree.ts`, tests,
  `docs/record-format.md` (English and Chinese), the `adrkit-grill` skill and
  its mirror in `src/core/tool-integrations.ts`, and
  `adr/decisions/6-record-frontier-rounds-in-the-deliberation-tree.md`.
