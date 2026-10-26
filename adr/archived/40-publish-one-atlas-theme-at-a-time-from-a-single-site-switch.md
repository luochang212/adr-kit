---
status: superseded
date: 2026-10-27
raised-by: human
decided-by: human
created: 2026-10-25
commit: 8dc58f5
superseded-by: 41
archived: 2026-10-27
archive-reason: superseded by ADR 41
tags:
  - visualization
  - website
  - themes
paths:
  - tools/build-decision-atlas.mjs
  - test/browser/atlas.spec.mjs
  - test/atlas-theme.test.ts
  - docs/atlas-themes.md
  - AGENTS.md
---

# ADR: 40 Publish one atlas theme at a time from a single site switch

## Problem

ADR 39 shipped two equally complete atlas themes and had the site publish both
in both languages, so `/decisions/` carried four pages. The maintainer wants
the site to show one — whichever matches the mood at the time — and only needs
the architecture to make swapping them trivial. Publishing both also meant
every theme had a public URL to keep stable, and readers met a choice the
decision explicitly rejected as an in-page control.

## Decision

The site publishes exactly one theme at a time. `SITE_THEME` in
`tools/build-decision-atlas.mjs` names it, `ATLAS_THEME` overrides it for a
single build, and the build writes only `index.html` and `en.html` for that
theme, removing any other `.html` left by a previous theme so a language keeps
one URL. Switching themes is changing that one word; the renderer, the CLI
surface, and both document stylesheets are untouched.

A `random` roll belongs to the CLI, not to a site build: the site selector
accepts `folio` or `signal` only, so a deploy never changes appearance by
itself. The homepage link in `Graph.astro` keeps pointing at the one published
path and gains no theme control.

Both themes stay first-class even though only one is served. The browser gate
renders each of them from the same records into a temporary tree, so Signal's
behavior is tested whether or not it is the published theme, and one check
holds the published directory to the selected theme and its two files.

## Alternatives considered

- Keep publishing both themes: the maintainer rejected showing two variants
  side by side, and it doubles the public URLs a theme change must keep stable.
- An in-page or site-wide theme switch: rejected already in ADR 39 — these are
  distinct compositions, not one adaptive skin, and the choice is not the
  reader's to make per visit.
- A per-build random roll (the CLI default): a deploy would silently change
  appearance and make screenshots and reviews unreproducible.

## Consequences

### Verification

- `test/atlas-theme.test.ts` pins the site selector to the two named themes and
  rejects `random`, `auto` and the empty string.
- `test/browser/atlas.spec.mjs` renders both themes from the real records as
  fixtures and keeps the behavioral checks across both themes and languages,
  plus a check that the published directory holds only `index.html` and
  `en.html` and carries the selected `data-atlas-theme`.
- `docs/atlas-themes.md` and `AGENTS.md` name the switch where the build reads
  it, so a future theme change edits one constant instead of hunting pages.

### Trade-offs

- Only one theme is browsable on the site at a time; the other exists in the
  package and the CLI, and in CI fixtures, but not at a public URL.
- The gate builds pages the site does not serve, which costs a few hundred
  milliseconds per run in exchange for keeping both themes honest.
