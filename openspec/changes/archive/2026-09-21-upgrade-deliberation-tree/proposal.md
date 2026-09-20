## Why

ADR 3 stored a grilling session's design tree as `- <text> [status]` and
rendered it with `adrkit tree`. The first real tree exposed three gaps: the
status tag is matched only at end of line, so a node with a reason after it is
silently unclassified; questions and accepted options are indistinguishable; and
no recommendation is stored, so the override signal the appendix exists to
preserve is absent. A view that cannot be drawn is a data model that is not
finished.

## What Changes

- Extend the `## Deliberation` grammar with an optional `Q:`/`A:` type
  prefix, a `[status]` tag, an optional `(recommended)` marker, and an
  optional ` — reason`.
- Render nodes by type and state, mark the recommended option, and mark an
  overridden question.
- Add `adrkit tree <name> --html` for a single self-contained HTML document.
- Migrate ADR 3's tree and use it as the acceptance sample.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `deliberation-tree`: the annotated grammar and the richer rendering modes.

## Impact

- `src/core/deliberation.ts`, `src/commands/tree.ts`, `src/cli.ts`,
  `src/commands/completion.ts`, tests, `docs/record-format.md` (English and
  Chinese), the `adrkit-grill` skill and its mirror, and
  `adr/decisions/3-model-provenance-and-grilling-output-as-first-class.md`.
