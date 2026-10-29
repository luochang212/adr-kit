---
status: implemented
date: 2026-10-27
description: "Read when publishing or linking the bilingual website previews of both named atlas themes."
raised-by: human
decided-by: human
created: 2026-10-26
paths:
  - tools/build-decision-atlas.mjs
  - test/browser/atlas.spec.mjs
  - test/atlas-theme.test.ts
  - docs/atlas-themes.md
  - README.md
  - README.zh.md
  - AGENTS.md
---

# ADR: 41 Publish both atlas themes as bilingual website previews

## Problem

ADR 40 publishes one theme at a time, so README readers cannot try both Folio
and Signal before choosing. After reviewing both themes, the maintainer
explicitly requested deploying both through Astro and linking each live preview
from both READMEs. The previous one-theme publication boundary no longer fits
that request.

## Decision

Publish Folio and Signal together, each in Chinese and English, from the same
records, shared template and pinned commit. `SITE_PAGES` in
`tools/build-decision-atlas.mjs` owns the fixed route inventory. Folio uses
`index.html` / `en.html`; Signal uses `signal.html` / `signal.en.html`.
The site prebuild generates all pages before removing obsolete generated HTML.
Each README links its own language's preview from the theme name in its table;
the screenshot still links to its full image. The homepage keeps its Folio link.
Remove the single-theme site switch. This replaces ADR 40's publication choice;
ADR 39's CLI selection policy and shared implementation remain: unspecified CLI
themes are random once per generation, explicit choices win, and an existing
artifact keeps its theme unless a change is requested. No page theme toggle is
introduced.

The maintainer determined that both previews should be published. The route
layout and build organization are the agent's implementation choices.

## Alternatives considered

- Keep one published theme and static screenshots of the other: the maintainer
  explicitly asked for actual pages that users can click through and try.
- Add a browser theme switch: the requested comparison is served by separate
  previews; the generation-time theme contract in ADR 39 remains unchanged.

## Consequences

### Verification

- Astro build contains both themes in both languages, each with the expected
  theme identity, identical record payload and pinned commit.
- README names open the correct language/theme route; screenshots open images.
- Shared browser checks pass in both themes and languages. The packed CLI and
  init/update resources reproduce the shipped interactions in another project.

### Trade-offs

- Both theme previews now have public routes and must be maintained together.
- The website build renders four atlas pages instead of two; behavior remains shared,
  so this adds generated artifacts rather than a second implementation.

### Publication update

The public entry now presents a bilingual theme gallery at `index.html` /
`en.html`; Folio's atlas routes are `folio.html` / `folio.en.html`, while
Signal's routes are unchanged. `SITE_PREVIEW_PAGES` owns the two gallery routes
and `SITE_PAGES` retains the four atlases. The homepage now opens Signal directly
in the reader's language, following the maintainer's choice to make the flagship
experience the primary entrance (ADR 42). Both READMEs retain the gallery entry;
their theme names still open the named previews. This route/presentation
adjustment preserves the publication and CLI selection decisions above.
