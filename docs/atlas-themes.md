# Atlas theme contract

Folio and Signal are equal first-class full-atlas themes. A theme owns its
presentation; it does not own a separate implementation of atlas behavior.
Signal's original page design is the reference for the mechanisms below.
Folio must retain them when its typography or layout changes.

## Agent-owned selection

Use this order, without adding a theme-selection step for the user:

1. Honor the user's explicit named theme, clear visual preference, or request
   for randomness.
2. When updating an existing atlas, pass its concrete `data-atlas-theme` value
   unless the user requests a different theme or a fresh random choice.
3. For a new atlas without a clear preference, use `--theme random`, also the
   CLI default. Do not infer a preference from project category, identity or OS.

`src/core/atlas-theme.ts` makes an equal-probability choice once at generation.
The resulting HTML stores a concrete identity. Refreshes and OS appearance
changes do not select again. There is no in-page switch. `--theme` applies only
to the full atlas; maps and deliberation trees reject it. The website publishes
one theme at a time: `SITE_THEME` in `tools/build-decision-atlas.mjs`, or
`ATLAS_THEME` for a single build, writes only `index.html` and `en.html` and
removes a previous theme's pages, so each language keeps one URL (ADR 40).
Switching is that one word, not a code change to the renderer; both themes stay
selectable through the CLI and the browser gate renders each of them from the
same records into a temporary tree instead of publishing both.

The installed agent instructions are `skills/adrkit-visualize/SKILL.md`, mirrored
in `src/core/tool-integrations.ts`. Init and update distribute both visual
styles in the same resource. Do not create a second template or fork runtime
scripts to add or repair a theme.

## Shared mechanisms

| Mechanism | Owner and verification |
| --- | --- |
| Current and archived records, full archived bodies, statistics, relationship data, source links and commit provenance | `src/core/decision-atlas.ts`; `test/decision-atlas.test.ts` |
| One offline file, no network/font/CDN dependency; bilingual chrome over the same records | Shared HTML resource and translation table; generated-file browser tests in both languages/themes |
| Drag/pan, pointer-anchored zoom, fit/reset, keyboard controls, bounded canvas, vertical page scrolling and touch handling | Shared canvas controller and the atlas adaptation; `test/canvas-view.test.ts` and browser checks |
| Relationship focus and embedded export helpers (neither atlas theme exposes a share button) | Byte-identical shared constants; `test/atlas-template.test.ts`, relation-focus/share tests |
| Density, timeline, replacement chains, reference counts, provenance and local-search directory | One runtime script set; renderer and browser tests |
| Hide unavailable modules and legend symbols; remove their chapter links, renumber chapters, expand a lone insight panel | Shared content activation logic; `test/browser/atlas-contract.spec.mjs` covers empty, unlinked, reference-only, replacement-only and archive-only records |
| Choose complete insight rows by measured height; sparse panels stay short; remeasure on width/font changes | `test/atlas-insights.test.ts` owns the 40rem preference / 50rem ceiling; browser checks also require the shipped corpus to retain at least three replacement rows and comparable panel proportions in both themes |
| Reader opening, full Markdown bodies, previous/next, keyboard/Escape, sticky controls, source access, and a page-scrollbar lock behind the modal reader (a reserved gutter keeps the toggle from shifting the layout) | Shared reader; reader unit tests and responsive browser tests |
| Omit an empty reference direction; omit the relation list and its lower border/padding when both directions are empty | Shared context renderer and corresponding theme styles; browser checks include 0/0, 0/12, 12/0, 1/12 and reopening records |
| Distribute both themes and agent policy via init/update and npm package resources | `test/integrations.test.ts`; package files include the shared resource and compiled selector |

Presentation differences are intentional: Folio has editorial typography and
hero actions. Both themes keep the source link in the reader header — Folio as
a quiet padded control, Signal as its original text link. Colors, card
treatment, responsive breakpoints and visual density may
differ. These differences do not authorize dropping a mechanism.

Signal's original inactive chapter-number spans have an existing 3.15:1 contrast
ratio. The maintainer required retaining this presentation; browser accessibility
checks exclude only those spans for Signal. The remaining document and reader
are checked. Do not silently describe this as complete WCAG conformance.

## Change gate

Run the common unit gate and `npm run test:browser`; the latter builds the
published page, renders both themes from the real records as fixtures and
exercises them in both languages. A theme change must pass
the shared behavioral checks and its intentional presentation checks. A new
behavior belongs in the shared runtime and should be tested across themes.
Maintain CLI help/completion, bilingual docs, installed skill text and packaged
resources together when selection or delivery changes.
