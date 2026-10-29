---
status: implemented
date: 2026-10-22
description: "Read when deciding how much archived record content to publish in the human-facing atlas."
raised-by: human
decided-by: human
created: 2026-10-22
commit: 147b36a
paths:
  - src/core/decision-atlas.ts
  - skills/adrkit-visualize/**
  - src/core/tool-integrations.ts
  - test/decision-atlas.test.ts
  - AGENTS.md
  - README.md
  - README.zh.md
---

# ADR: 31 publish archived bodies in the decision atlas

## Problem

ADR 29 published the decision atlas with archived bodies excluded: the payload
carried only their metadata, and the archive-page example's reader showed a
notice pointing at the source record. The boundary mirrored the agent reading
posture — `archived/` is not read by default — onto a human reading surface,
but the two audiences take different signals from the page. An agent that sees
the archived tag already knows the record is not current authority, whatever
the page does; a person who opens an archived card and finds the text withheld
does not learn unimportance — they learn that something is hidden, and the
withholding itself invites the question it was meant to save. The maintainer
reviewed the published page and directed that archived bodies be shown in
full.

## Decision

- The atlas payload renders `body` from the record's sections for every
  record, implemented or archived, through the same `markdownBody` path.
- The archive-page example's reader renders that body through its generic
  Markdown path and no longer appends the metadata-only notice. The
  archived/current distinction stays visible where it already lived: the
  reader's status chip, the directory's archived-card styling, the timeline's
  retired points, and the replacements note. Nothing about the distinction is
  removed — only the withholding of text.
- Generation guidance follows the page: the `adrkit-visualize` skill, the
  standing orders, and both README prompts say to publish archived bodies in
  full while keeping the archived/current distinction visible. ADR 20's
  reading posture is unchanged: agents still do not read `archived/` by
  default, and the page serves a reader who already chose to open history.
- This amends the archived-body trade-off of ADR 29 only. Its build-time
  generation, slot contract, commit pinning, and record scope are unchanged;
  ADR 29 stays active.

## Alternatives considered

- **Keep the metadata-only page (ADR 29's boundary)**: rejected by the
  maintainer. The folder and status already carry the importance signal for
  agents; withholding the body from humans adds an extra hop to content that
  is public in the repository, and the withheld page reads as hiding rather
  than as de-emphasis.
- **Change only this repository's built atlas and leave the example guidance
  alone**: rejected. The example is the atlas's template through the `atlas:`
  slot contract — one frontend for both consumers; splitting them recreates
  the two-frontend drift ADR 29 avoided.
- **Drop archived records from the atlas entirely so the question never
  arises**: rejected. The map would lose supersede edges and break chains
  through retired decisions; ADR 9 settled this class as mark, never exclude.

## Consequences

- The published page now shows a reader who opens an archived card its full
  text beside its status chip, archive reason, and successor link, so the
  "why was this retired" question is answered on the page instead of one hop
  away.

### Verification

- `renderDecisionAtlas` emits the archived record's body in the payload; the
  test asserts the archived fixture body ships and the archive reason stays.
- The shipped example carries no metadata-only notice, and
  `src/core/tool-integrations.ts` stays byte-synchronized with the skill; the
  integration tests prove the sync.
- The standing-orders template and this repository's AGENTS.md carry the new
  sentence with the refreshed fingerprint marker; `adrkit list` reports no
  standing-orders drift.
- The regenerated atlas from `tools/build-decision-atlas.mjs` contains
  archived bodies; `npm test`, `npm run typecheck`, `npm run build`, and
  `adrkit validate --all` pass.

### Trade-offs

- The published page grows with the archive, duplicating frozen bytes in a
  snapshot. Mitigated by build-time regeneration from `adr/` and the commit
  pin; the bytes are public repository content either way.
- A skimming reader could mistake an archived body for current guidance.
  Mitigated by the status chip, the archived card styling, the replacements
  note stating that current constraints live in the active set, and successor
  links.
- The agent posture and the page now differ on purpose: agents skip `archived/`
  by default while the page publishes it in full. That asymmetry is the
  decision — the tag is the signal for an agent, the text is the answer for a
  person.
