---
status: implemented
date: 2026-10-22
raised-by: human
decided-by: agent
created: 2026-10-21
commit: a2a2462
tags:
  - visualization
  - website
  - delivery
paths:
  - src/core/decision-atlas.ts
  - src/core/graph-html.ts
  - tools/build-decision-atlas.mjs
  - skills/adrkit-visualize/**
  - src/core/tool-integrations.ts
  - skills/adrkit-init/SKILL.md
  - site/**
  - .github/workflows/site.yml
  - README.md
  - README.zh.md
  - AGENTS.md
  - assets/decision-atlas.png
  - test/decision-atlas.test.ts
  - test/visualization-example.test.ts
---

# ADR: 29 Publish the project decision atlas from current records at site build time

## Problem

The full decision atlas is an installed visualization resource, but README.md
and the project homepage mainly expose the basic graph. The Pages workflow
builds only site/, so the ignored output/ artifact is neither published nor
refreshed when ADRs change. Publishing that file by hand would leave another
snapshot to maintain. The maintainer requested a discoverable online atlas,
homepage and README entry points, and a short agent route.

## Decision

The site build generates `/adr-kit/decisions/` from the current `adr/implemented/`
and `adr/archived/` records. `tools/build-decision-atlas.mjs` runs before
`astro build` and `astro dev`, reads the records through the compiled CLI, and
writes the self-contained page to `site/public/decisions/index.html`; the
generated file is ignored by Git. `src/core/decision-atlas.ts` supplies the
records payload, statistics, prose, footer, and source links, and the graph
renderer exposes `renderDecisionMapSvg` so the atlas embeds the same drawing the
map command produces. Each node links to an in-page `#adr-N` anchor and the
reader's source link points at the build commit; archived records publish only
metadata and a source link.

The page reuses the installed archive-page example as its template through the
explicit `atlas:` slots: title, hero, statistics, section notes, map, footer,
and the records array. The example stays the reference for other repositories;
the slots are the contract that keeps the published atlas and the installed
frontend one implementation. No second UI, runtime API, or new dependency is
introduced.

Both READMEs link the live atlas with a screenshot and a reusable generation
prompt, and both homepage languages link it from the graph section. The
standing orders route history-review requests to `adrkit-visualize` and state
the boundary: implemented and archived records only, archived bodies out, page
pinned to its build commit. The Pages workflow rebuilds when `adr/`, the
renderer, the resource, the site, or the CLI changes, and installs the root
dependencies and build before the site build.

This partially extends ADRs 9, 12, and 13: the basic graph and single-record
tree remain available, and ordinary agent work still does not automatically
generate HTML. The maintainer requested the public atlas and approved automatic
regeneration; the agent chose the build-time renderer and shared slot mechanism.

## Alternatives considered

- Copy output/decision-atlas.html into the website: simple initially, but its
  embedded records and summaries would become stale independently of adr/.
- Build a separate Astro atlas UI: duplicates the already shipped frontend,
  so future rail and reader improvements would need two implementations.
- Link only to the raw HTML on GitHub: source browsing does not provide the
  interactive experience requested for the homepage.

## Consequences

### Verification

- `node tools/build-decision-atlas.mjs` writes `site/public/decisions/index.html`
  with 29 current records and 63 reference edges at the checked-out commit; the
  page carries working in-page node anchors, source links, and a footer pinned
  to the same commit.
- The payload contains implemented and archived records only; archived bodies
  are empty strings, while titles, archive reasons, and source links remain.
- `site/package.json` runs the generator before `dev` and `build`; the site
  build copies the page to `site/dist/decisions/index.html`, and both homepage
  languages link `/adr-kit/decisions/`.
- `test/decision-atlas.test.ts` exercises changing record data, statistics and
  prose, in-page anchors, safe `</script>` handling, archived bodies, and a
  missing slot; it also holds the shipped example to every slot the build
  expects.
- `npm test` passes with 1 skipped; `npm run typecheck`, `npm run build`, the
  site build, and `adrkit validate --all` pass.

### Trade-offs

- The website build now needs the root CLI dependencies and a compiled `dist/`;
  CI installs and builds both dependency sets, and a local site build fails with
  an instruction to run `npm run build` first.
- The example remains a reference for other repositories while its slots are
  also this repository's build contract; changing a slot definition or the
  records declaration affects both consumers and must be done together.
- The published page is a snapshot pinned to one commit and is regenerated only
  when the workflow runs; it is not a runtime API over `adr/`.
- Metadata in the atlas is public repository content. Archived bodies stay out,
  but implemented bodies and provenance declarations are published in full.
- The atlas chrome is Chinese, matching the archive-page example. It is a
  showcase of this repository's own records, not a localized site page, so both
  homepage languages link to it as-is without a bilingual promise.

### Later changes

**Amended by ADR 31:** the archived-body trade-off above changed: the atlas
and the example now publish archived bodies in full, keeping the
archived/current distinction visible; the metadata-only rule and the
empty-body verification above are historical.

