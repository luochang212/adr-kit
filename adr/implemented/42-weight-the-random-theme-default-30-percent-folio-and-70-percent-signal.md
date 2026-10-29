---
status: implemented
date: 2026-10-27
description: "Read when changing the generation-time random theme distribution or its explicit-selection override."
raised-by: human
decided-by: human
created: 2026-10-27
commit: fa0159b
paths:
  - src/core/atlas-theme.ts
  - skills/adrkit-visualize/**
  - src/core/tool-integrations.ts
  - test/**
  - docs/atlas-themes.md
  - docs/cli.md
  - docs/zh/cli.md
---

# ADR: 42 Weight the random theme default 30 percent Folio and 70 percent Signal

## Problem

ADR 39's random default presents both themes as equals, but the maintainer now
positions Signal as the project's flagship theme. A fair coin delivers the
flagship to a new user who omits `--theme` only half the time, which no longer
matches how the project wants to present itself.

## Decision

Omitting `--theme` and passing `--theme random` roll a weighted default —
Folio 30%, Signal 70%, once at generation. ADR 39's rules are otherwise
unchanged: the identity is baked into the HTML once, explicit themes bypass
the roll, and there is no reroll or in-page switch. The ratio lives in
`selectAtlasTheme` (src/core/atlas-theme.ts) and is pinned by
`test/atlas-theme.test.ts`; the CLI docs, both READMEs and the installed AI
guidance state it. The website keeps building both themes deterministically
under ADR 41's explicit page inventory, so published previews never depend on
the weights. The maintainer set both the direction and the ratio.

## Alternatives considered

- Keep 50/50: rejected by the maintainer — the default should advertise the
  flagship theme rather than neutrality.
- Make Signal the only default (100/0): erases Folio's discovery path; ADR 39's
  premise ships both themes, so Signal is favored, not exclusive.
- Rename the default from `random` to `auto` or `default`: a breaking CLI
  rename with no behavioral gain; a weighted roll is still a random choice.

## Consequences

### Verification

- `test/atlas-theme.test.ts` pins the weighted roll: mocked `randomInt(10)`
  values 0–2 select Folio and 3–9 select Signal, exactly one roll per call;
  explicit themes still never roll.
- `test/integrations.test.ts` keeps the installed AI guidance identical to
  `skills/adrkit-visualize/SKILL.md`, which states the 30/70 split.
- `docs/cli.md`, `docs/zh/cli.md`, `README.md` and `README.zh.md` carry the
  ratio in both languages.

### Trade-offs

- The default is no longer neutral: repeated generation favors Signal 7 to 3,
  so a user who wants Folio must ask for it explicitly more often than before.
- The ratio lives in code, agent guidance and user docs; the integration sync
  test keeps the guidance from drifting, while the docs state it directly.
