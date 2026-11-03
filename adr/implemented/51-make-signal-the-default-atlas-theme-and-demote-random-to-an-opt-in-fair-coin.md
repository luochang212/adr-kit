---
status: implemented
date: 2026-11-03
description: "Read when changing the atlas theme default, the random roll, or how generation-time theme selection is documented."
raised-by: human
decided-by: human
created: 2026-11-03
paths:
  - src/core/atlas-theme.ts
  - src/core/decision-atlas.ts
  - src/commands/atlas.ts
  - src/cli.ts
  - src/core/tool-integrations.ts
  - skills/adrkit-visualize/**
  - test/**
  - docs/atlas-themes.md
  - docs/cli.md
  - docs/zh/cli.md
  - README.md
  - README.zh.md
  - site/public/llms.txt
  - docs/upgrading.md
---

# ADR: 51 Make Signal the default atlas theme and demote random to an opt-in fair coin

## Problem

ADR 42's weighted default rolls Folio 30% / Signal 70% on every generation
that omits `--theme`. The roll fires again each time the atlas is regenerated,
so a project that rebuilds as records land can flip between Folio and Signal
without anyone choosing a theme; the only guard is advisory agent guidance to
read the previous file's `data-atlas-theme` and pass it back. A human running
the CLI has no lock at all, and repeated generation stays unpredictable — the
trouble a stable default should have avoided.

## Decision

Omitting `--theme` renders Signal — deterministically, with no roll. `--theme
random` remains a feature: passing it rolls a fair 50/50 coin between Folio
and Signal once at generation. An explicit `--theme folio|signal` still
bypasses selection, the chosen identity is still baked into the HTML as
`data-atlas-theme` with no browser-side selection or reroll (ADR 39), and an
existing artifact still keeps its theme when updated unless the user requests
a change or a fresh random choice. The default lives in `selectAtlasTheme`
(src/core/atlas-theme.ts). Agent guidance now says to omit `--theme` for a new
atlas without a clear preference instead of preferring `--theme random`.

The maintainer set the direction — Signal as the plain default, random as an
opt-in feature with even odds — and the ratio.

## Alternatives considered

- Keep the weighted 30/70 default (ADR 42): rejected — the drift that
  motivated it remains, and its flagship rationale disappears once omission
  renders Signal directly.
- Persist the first roll in a config file and reuse it on later generations:
  rejected — it adds repository state, a migration surface, and questions
  about what happens when the output moves; the deterministic default
  achieves the same stability with none.
- Detect an existing `--out` file's theme in the CLI and reuse it on
  regeneration: rejected for now — it changes overwrite semantics and can
  surprise a user who expected a fresh generation; the agent rule already
  preserves the theme on updates.

## Consequences

### Verification

- `test/atlas-theme.test.ts` pins the new rule: an omitted selection resolves
  to Signal without calling `randomInt`; `--theme random` rolls `randomInt(2)`
  exactly once, with 0 selecting Folio and 1 selecting Signal; explicit names
  still never roll.
- `test/cli.test.ts` exports a full atlas with an omitted `--theme` and reads
  `data-atlas-theme="signal"` from the output.
- `test/integrations.test.ts` keeps the installed AI guidance identical to
  `skills/adrkit-visualize/SKILL.md`, which states the omit-for-default and
  fair-coin rule.
- `docs/cli.md`, `docs/zh/cli.md`, `docs/atlas-themes.md`, both READMEs and
  `site/public/llms.txt` state the new selection rule, and `test/docs.test.ts`
  pins the front door to it. `docs/upgrading.md` carries an after-0.35.0 note
  and a changeset records the release note.

### Trade-offs

- New atlases no longer sample Folio: a user who wants the paper style asks
  for `--theme folio` or rolls `--theme random`.
- Users who relied on re-running the CLI to re-roll the theme must pass
  `--theme random`; the behavior change is user-facing and is called out in
  the upgrade guide and the changeset.
