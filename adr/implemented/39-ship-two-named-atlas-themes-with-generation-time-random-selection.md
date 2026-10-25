---
status: implemented
date: 2026-10-25
raised-by: human
decided-by: human
created: 2026-10-25
commit: 246c65d
tags:
  - visualization
  - website
  - themes
paths:
  - src/core/atlas-theme.ts
  - src/core/decision-atlas.ts
  - src/commands/atlas.ts
  - src/core/cli-options.ts
  - src/cli.ts
  - skills/adrkit-visualize/**
  - src/core/tool-integrations.ts
  - tools/build-decision-atlas.mjs
  - test/**
  - docs/atlas-themes.md
  - docs/cli.md
  - docs/zh/cli.md
---

# ADR: 39 Ship two named atlas themes with generation-time random selection

## Problem

The maintainer wants both the existing dark archive and the new light editorial
archive distributed in the npm package, with equal functionality. They explicitly
rejected system light/dark selection and in-page switching: these are distinct
visual themes, and the generating agent should choose one or roll a random choice.
ADR 29 currently owns one shared offline template; ADRs 31/34 preserve complete
archived text and bilingual generation. None owns theme selection.

## Decision

Ship exactly two full-atlas themes: Folio (paper/editorial) and Signal
(dark/instrumental). The agent chooses `--theme folio` or `--theme signal`;
`--theme random` and omission choose one with equal probability, once at generation.
Agents prefer random for new atlases without a clearly stated preference,
honor explicit theme/visual requests, and preserve the fixed theme when updating
an existing file unless the user requests a change or a fresh roll. They do not
prompt merely to break the tie or infer style from project category or OS.
The selected identity is baked into HTML. There is no browser preference lookup,
local storage, theme button or reroll on load. A shared template and scripts keep
records, links, map, search and reading behavior shared. Only the selected
document stylesheet is enabled at generation, so Folio styles cannot cascade
into Signal. Signal retains its original page design and opening without hero
actions; only its reader provenance/reference blocks are redesigned. Its source link
stays in the original header slot and reference directions occupy separate rows.

This independently extends ADR 29's shared renderer and ADR 36's explicit object
selection. Theme is valid only for the full atlas, not standalone maps or trees.
The website explicitly builds both themes in both languages, using Folio at its
existing URLs and Signal at `signal.html` / `signal.en.html`. AI-facing guidance,
CLI/help/completion and bilingual docs name the same choices.

The maintainer determined the two-theme boundary and generation-side selection.
The agent proposed the names, equal-probability default and fixed HTML attribute.

## Alternatives considered

- System preference plus an in-page toggle: explicitly rejected by the maintainer;
  these are separate visual compositions, not one adaptive light/dark skin.
- Random choice at every page load: refresh and shared screenshots would change
  style without changing the file, making generated artifacts unpredictable.
- Duplicate templates and scripts: every reader or map fix would need to be
  carried twice, undoing ADR 29's single-frontend contract.

## Consequences

### Verification

- `test/atlas-theme.test.ts` pins both random outcomes and the rejection of
  invalid names deterministically; `test/cli.test.ts` proves invalid names and
  `--map`/`--record` combinations fail before any output write.
- `test/browser/atlas.spec.mjs` holds one generated file to its
  `data-atlas-theme` across reloads and emulated system appearance changes,
  with no theme UI and zero runtime network requests.
- `docs/atlas-themes.md` carries the shared mechanism contract;
  `test/integrations.test.ts` checks the installed AI instructions and the
  init/update distribution of both styles in one resource.
- Both languages and themes pass the same browser suite, including responsive
  directory columns, full archived bodies, context navigation, map and range
  hover; unit tests, typecheck, CLI/site builds and ADR validation pass, and
  installed visualize guidance matches its source.

### Trade-offs

- Random output makes repeated generation differ in style; explicit names give
  reproducible artifacts, and site builds always use explicit names.
- Distinct layouts create a second visual test surface; data and behavior stay
  shared, with the browser suite parameterized by theme.

