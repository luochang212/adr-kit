## Why

ADR 6 patched the deliberation tree's lost order with a `(round N)` label on a
flat list of questions. The label does not render as progression: every question
stays a child of the root, so dependent questions draw as parallel boxes. The
same file format already carried the working convention — ADR 5 nests its
follow-up questions under the option that raised them — so the label is a second
representation of a relationship the outline already expresses structurally.

## What Changes

- Make nesting the dependency channel: a follow-up question is a child of the
  node whose settlement raised it, so related questions run deeper and unrelated
  ones stay flat.
- Remove the stored `(round N)` grammar; a node's frontier round is read from
  depth rather than written into the record.
- Style the edge that raised a follow-up question so the tree's depth reads as
  the frontier moving outward, and add a legend to the HTML view.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `deliberation-tree`: the grammar loses `(round N)`, dependency becomes
  nesting, and the renderer styles the unlock edge.

## Impact

- `src/core/deliberation.ts`, tests, `docs/record-format.md` and
  `docs/zh/record-format.md`, `docs/cli.md` and `docs/zh/cli.md`, the
  READMEs, the `adrkit-grill` skill and its mirror in
  `src/core/tool-integrations.ts`, and
  `adr/decisions/7-record-dependency-by-nesting-not-round-labels.md`
  (supersedes ADR 6).
