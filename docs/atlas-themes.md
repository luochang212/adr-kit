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

`src/core/atlas-theme.ts` makes a weighted choice once at generation: Folio 30%
and Signal 70% (ADR 42).
The resulting HTML stores a concrete identity. Refreshes and OS appearance
changes do not select again. There is no in-page switch. `--theme` applies only
to the full atlas; maps and deliberation trees reject it.

Favicons are embedded SVGs selected at generation time: Folio uses the light
pastel mark and Signal uses the dark mark. They remain available offline.

The website publishes deterministic bilingual previews of both themes from the
same template, records and build commit. `SITE_PAGES` in
`tools/build-decision-atlas.mjs` owns the atlas routes. `SITE_PREVIEW_PAGES`
publishes a theme gallery at `index.html` (Chinese) and `en.html`; Folio uses `folio.html` and
`folio.en.html`, and Signal uses `signal.html` and `signal.en.html`.
Astro's prebuild writes both gallery languages and all four atlas pages before
obsolete generated HTML is removed. The gallery uses the README screenshots
and links to the actual theme pages; it does not add a theme switch to an atlas.
The homepage opens Signal directly in the reader's language. Both READMEs retain
the theme gallery entry and link each named theme in the reader's language.
These public examples do not change the CLI's random default or add
an in-page theme switch. The browser gate checks all published routes and also
uses isolated per-theme fixtures for behavioral checks.

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
| Distribute both themes and agent policy via init/update and npm package resources | `test/integrations.test.ts`; `test/browser/atlas-package.spec.mjs` installs a local tarball outside the source tree, checks both integration targets and update, then generates and exercises the bilingual Signal desk with that package's CLI |

Record descriptions supply directory summaries, reader introductions and local-search text.
Maps use a single accent for current decisions and gray dashed styling with
explicit lifecycle text for archived records; no maintained category or tag palette is used.

Both themes hide the decision map's on-screen legend at viewport widths up to
760px to preserve canvas space. Map controls, pan/zoom and record opening remain
available; the desktop legend continues to follow the data present.

All displayed ADR identifiers, chapter numbers and deliberation question
numbers use natural integers without leading zeros, in both themes and
languages. For example: `ADR 3`, chapter `2`, and `QUESTION 1`. Date/time
formats and character escapes keep their required fixed-width components.

Presentation differences are intentional: Folio has editorial typography and
hero actions. Signal opens with a large project heading, a bilingual statement,
and a stack of up to three actual records, shuffled at the start of each round; active and
archived records retain their status. The stack uses landscape folder covers on desktop and near-square covers where
mobile space permits; narrow covers may grow taller to preserve readable contents.
Covers have exposed numbered tabs, the same dark slate paper color on every file;
there are no edge glows. Asymmetric offsets and opposing rotations expose
numbered tabs and corners. Shadows vary by height: the bottom sheet stays close
to the desk, the middle casts a compact shadow, and the top casts a longer,
softer shadow. Isolated contact shadows, subtle paper grain and creases,
and slight lighting differences over the shared base color separate
the same-colored sheets. Desktop tracks share space with the heading instead
of pushing a narrow stack against the right edge. Covers omit the title's repeated ADR number and show
an extract from Decision, falling back to record context when it is absent.
After the last file is taken, a quiet reset button returns every file to the
desk in a newly shuffled order; an empty repository has no reset.
Only the front cover reveals its contents; the backing files expose their IDs.
 On desktop (1024px and wider), only picks from the hero open a modal left
reader. Its native dismiss backdrop covers the entire background, including the stack,
with the same dimming and blur as the ordinary reader backdrop. Clicking it
closes the reader without taking another file; the next file requires a fresh
click after the reader closes. Other
entry points keep the modal right reader; mobile archive picks keep that same
modal presentation. Reader links and previous/next retain their current entry
mode, and resizing an open archive reader adapts its mode. Only the top file can be taken. Hover highlights every exposed surface without
moving its geometry or changing its depth; clicking a back file gives a brief
stationary highlight without opening or consuming it. Taking the top file first extracts and straightens
it for 160ms, then expands it into the shared reader over 300ms and replenishes
only that file; untouched cards keep their order. Escape during extraction
cancels without consuming a file. Closing
returns focus to the next file (or the completion message); directory/history navigation never
consumes the stack. Consumption lasts only for the current page visit. One or
two records show one or two cards; exhaustion shows a completion message and an
empty repository never invents cards. Reduced motion skips the expansion.
All four statistics sit inside Signal's hero; it has no bottom down-arrow.
Signal's hero fills at least the viewport below the chapter bar, ending with
statistics before the next section starts. Folio's hero also fills that viewport;
its title, introduction, actions, statistics and decision density flow as one
group. On desktop the introduction and density regions share spare height,
keeping the space above and below statistics balanced; the density lower rule
aligns with the viewport bottom. Only shorter windows tighten vertical spacing;
type sizes, horizontal proportions and density chart height stay unchanged.
Mobile stays natural. Short/mobile viewports may scroll
through taller content. Browser checks enforce exact first-screen alignment on
desktop windows at least 800px tall; shorter windows retain the content grouping,
full density chart, reachable actions and no horizontal overflow. Reader scroll
restoration is measured after its trigger is brought into view and focused.
Page entrance and count-up effects stay inside the
hero; subsequent sections, density bars and directory cards appear normally.
Both themes keep the source link in the reader header — Folio as
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
