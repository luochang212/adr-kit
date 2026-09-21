## Why

A two-axis review of the seven unpushed commits on `main` (fixed point
`origin/main`) confirmed the feature direction but found defects that survived
the green gate. Every item was reproduced against the real code before a line
changed; the evidence is in `design.md`.

The most serious are silent data problems. The parser cut the reason at a bare
hyphen anywhere in the line, so a node whose text contains ` - ` lost its
`[status]` and `(recommended)` into the reason. And `supersede` and `accept` drop
the `tags` list because the lifecycle rewrite only carries scalar fields: ADR 5
and ADR 6 here lost their tags that way, and the new map tints nodes by tag.

Neither shape ships in a release — the hyphen separator, the `(round N)` reader,
and ADR 6's round markers all arrived in these unpushed commits — and ADR 3
already declines compatibility for this 0.x self-use tool. So the fix carries no
shim: one separator, nothing reads a round.

## What Changes

- Make the em dash with surrounding spaces the only reason separator, so a
  hyphen in the text is text and can never swallow the state; delete the legacy
  hyphen fallback and the `(round N)` reader, and migrate ADR 6's own tree off
  the marker the grammar no longer has.
- Share one escaping and wrapping helper across the SVG map, the card tree, and
  Mermaid labels, and wrap by display width with East Asian wide characters
  counted double, so a title or question with no spaces wraps instead of
  overflowing its card.
- Carry `tags` through lifecycle moves: `supersede` keeps the list and `accept`
  inherits the draft's; restore the tags ADR 5 and ADR 6 lost.
- Reject two output formats on `adrkit tree` with the same error `adrkit graph`
  already gives, instead of silently preferring one.
- Treat `Ctrl + scroll` and `⌘ + scroll` alike in the canvas, as the on-screen
  hint and ADR 11 already promise.
- Key the unlock edge off the node that raised the follow-up rather than the
  card it is drawn from, so Mermaid and the card tree agree when the raising
  option sits on the root card.
- Correct the stale `adrkit tree` samples in `docs/cli.md` and
  `docs/zh/cli.md` and pin them to real renderer output with a test; document
  the single separator and the re-stamped `commit`.
- Make `adrkit graph` report a record with no `created` instead of grouping it
  under its status date.
- Spec: an override requires a recorded recommendation, the em dash is the only
  separator, two formats conflict, and text without spaces wraps.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `deliberation-tree`: the grammar has exactly one reason separator, an override
  needs a recorded recommendation, two format flags conflict, an unknown
  parenthetical is text rather than a round marker, and text without spaces
  wraps inside its card.

## Impact

- `src/core/deliberation.ts`, `src/core/deliberation-view.ts`,
  `src/core/deliberation-html.ts`, `src/core/graph-html.ts`, `src/core/graph.ts`,
  `src/core/view-text.ts` (new), `src/core/templates.ts`, `src/core/canvas-view.ts`,
  `src/cli.ts`.
- `test/deliberation.test.ts`, `test/graph.test.ts`, `test/supersede.test.ts`,
  `test/docs.test.ts`.
- `docs/cli.md`, `docs/zh/cli.md`, `docs/record-format.md`,
  `docs/zh/record-format.md`, `.changeset/canvas-interaction.md`,
  `.changeset/no-created-fallback.md` (new).
- `adr/decisions/5-…md` and `adr/decisions/6-…md`: the `tags` list the
  supersede bug dropped is restored, and ADR 6's tree loses the `(round 1)`
  markers the grammar no longer defines. No decision or body prose changed; the
  record format gains no field, so no ADR is recorded for this work.
