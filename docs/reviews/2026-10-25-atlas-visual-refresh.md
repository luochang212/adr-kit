# Decision atlas visual refresh

The previous atlas gave headings, notes, cards and figures similar visual
weight. Small text and repetitive card styling made the full archive
feel like a dense dashboard. The template also carried twelve successive
page-style blocks whose overrides made a deliberate change hard to follow.

The refresh uses warm paper, dark ink and one rust accent. Serif display type
separates headings from sans-serif body copy; monospace stays with identifiers
and metadata. The opening pairs project identity with context and direct links
to the directory and map. The density chart sits beside its explanation on
desktop; the directory uses three compact columns with lightly bordered cards
and unclipped titles, reducing to two columns on intermediate screens and one
on phones. Shared grid tracks align each row’s titles, summaries and tags, with
an ordinary grid fallback. The reader has a bounded text column, larger body
type and a sticky control header. Its source link sits quietly below the tags
on the left, outside that header. Provenance uses a three-column definition
list with labels above values on a quiet background. References use a separate
definition list with fixed label widths and wrapping ADR buttons. Empty
reference directions are omitted; when both are empty the relation list is absent; actor declarations
are displayed as 人/Human or Agent without changing record data. One divider
separates this context block from the body. Mobile uses a full-height reader.

The source has two independent document stylesheets alongside the byte-identical shared
canvas, relation and share styles. The current/archived distinction, complete
record text, source commit, and six-section navigation remain. No external
font, image, script or service is needed to read the generated HTML.

## References and scope

Genesis Project's `frontend-craft` patterns informed the composition:
`feed-header` (an information-first header), `reading-column` (bounded long-form
text), `section-index-eyebrow` (quiet wayfinding), and `site-nav` (compact
navigation). These are layout principles; no case-study brand or asset is
copied. The installed atlas reference and the generated site use the same
template, following ADR 29. Full archived bodies (ADR 31), bilingual generation
(ADR 34), and provenance-only footers (ADR 37) remain in effect.

The presentation remains reversible and adds no record format or generated-page
dependency. The two-theme boundary and generation-time selection are captured
in the accompanying theme proposal.

## Verification

- `npm test`: 683 passed, one conditional skip.
- `npm run typecheck`, CLI and Astro site builds, and `adrkit validate --all`
  pass.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`: 54 checks pass across both named themes. The tests
  open the actual English and Chinese generated files over `file://`, observe
  zero HTTP requests, and cover 320/390/768/1440/1920px, document overflow,
  chapter links, search and empty results, archived bodies, previous/next,
  Escape, map opening and controls, vertical page scrolling over the map,
  enlarged root text, and sticky reader controls after scrolling to the end.
  Layout assertions check three/two/one directory columns, aligned summaries,
  and the left-aligned, commit-pinned source link below the tags. Two reader
  metadata checks validate definition-list values, date semantics, labels above
  values, reference counts against actual map edges, and reference navigation.
  WCAG A/AA automated checks run on both languages at 390/1440px, on the page
  and in the reader. An existing map issue found by these checks was corrected:
  the interactive SVG is a group rather than an atomic image, so its focusable
  record links remain represented in the accessibility tree.
- The shared canvas/style equality and existing record-rendering tests stay in
  the unit suite. The browser gate also runs in CI; the local Chrome run does
  not claim a completed GitHub-hosted run or Safari/Firefox verification.
- README atlas screenshots are refreshed in both languages at 1440×1000.

To repeat the browser checks with bundled Chromium:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

The generated preview is `site/public/decisions/index.html` (Chinese) and
`en.html` (English). No npm release or site deployment was performed.

## Range hover follow-up

A hover screenshot exposed two gaps in the viewport thumb outline. The date
preview paints at z-index 1 above the thumb at z-index 0; its opaque fill masked
the top and bottom borders, while browser measurements confirmed the thumb
geometry stayed unchanged. The preview now uses a translucent tint, preserving
the outline and labels without changing hit testing or drag behavior. Two new
browser regressions (Chinese and English) reproduced the opaque fill before
the fix and pass afterwards, also checking stable geometry, leave cleanup and
keyboard movement. The targeted 52 atlas unit tests and the site build pass.


## Two named themes

Folio retains the paper composition above. Signal preserves the original page
styles and original opening copy, without the two hero actions. Only its reader
is redesigned: provenance fields use a ruled band with cell separators;
reference relationships use two stacked rows with aligned labels and wrapping links. At generation, exactly one
stylesheet is enabled; Folio's page rules cannot cascade into Signal. Records,
map, search and reader logic remain shared.


`--theme folio|signal` selects explicitly. `--theme random` and omission choose
with equal probability once during generation; a concrete HTML attribute fixes
the result. No OS preference, local storage, runtime randomization or theme UI is
used. Standalone maps and trees reject the option before writing output. Website
builds name themes explicitly: existing index/en files use Folio, signal.html
and signal.en.html use Signal. This keeps site builds reproducible.

Deterministic unit tests cover both random outcomes, explicit choices, invalid
values and CLI object restrictions. Browser tests also emulate both OS color
schemes and reload each theme to confirm the file remains fixed.


## Signal scope correction

The first two-theme implementation unintentionally inherited Folio typography,
spacing and cards outside the authorized reader changes. Restoring Signal's
original page CSS restores its insight proportions without changing the height
algorithm or its existing unit specification (`test/atlas-insights.test.ts`).
At 1280×720 with the same current records, the altered styles produced 669px
references / 570px replacements (two rows). The restored styles produce 632px /
666px (three rows), matching the original stylesheet exactly. The algorithm
continues to select complete rows near 40rem with a 50rem ceiling, not force
exactly equal panel heights. A browser regression now covers those proportions
and the absence of hero actions, alongside the existing algorithm tests.

The original inactive Signal chapter-number spans have 3.15:1 contrast; this
pre-existing presentation is retained under the explicit scope constraint.
The browser accessibility gate excludes only those spans for Signal; the
remaining page and the redesigned reader still receive the full audit.


## Signal reader scope clarification

Signal keeps its source link in the original reader-header slot immediately
after the record metadata; Folio retains its separate byline placement. Both
use exactly one source link. Signal's outgoing and incoming references occupy
two full-width rows, with a fixed label column and wrapping ADR links. Browser
checks cover zero outgoing / twelve incoming references at 320px and 1440px,
including no horizontal overflow. The rest of Signal's page remains unchanged.


Both themes omit each empty reference direction and omit the entire relation
list when neither direction has links. Browser checks cover zero/zero,
zero/twelve, twelve/zero and one/twelve links at phone and desktop widths,
including reopening after populated relationships to catch stale content.

When both reference directions are empty, the context block also drops its
bottom border and bottom padding, avoiding a second rule below Signal's
provenance band. The CSS derives this directly from the absence of the relation
list with `:not(:has(...))`. The same rule applies to Folio. Browser checks
assert border/padding removal for empty records and restoration for populated
records in both themes at phone and desktop sizes.


## Mechanism parity audit

`docs/atlas-themes.md` now owns the common mechanism and selection contract.
The generator produces identical runtime scripts and record payloads for Folio
and Signal in each language; a unit regression asserts this. The shared
canvas/relation/share equality and behavioral tests remain active. Init/update
regressions verify both resources and selection guidance for standard and Claude
integration targets, and a local packed npm install independently exercised
init, update and folio/signal/random exports without a global install or publish.

The audit found two concrete gaps:

- Folio's larger insight padding let the same height algorithm keep only two
  replacement rows at 1280×720. Reducing only its paired-panel padding to two
  thirds of its section spacing gives about 654px / 691px and three replacement
  rows; Signal remains about 632px / 666px. The common browser check now covers
  both themes, without fixed panel heights or clipped cards.
- An empty archive threw `RangeError: Invalid time value` while drawing its
  timeline before module cleanup. The shared timeline now returns when no
  records or timeline element exists. New generated-file checks exercise empty,
  unlinked, reference-only, replacement-only and archive-only corpora at phone
  and desktop sizes in both languages/themes; they verify module/legend
  activation, contiguous chapter numbers, valid targets and no script/network
  errors. Archived-only fixtures also open the full body and pinned source link.

The selection policy now prefers random for new atlases without explicit visual
preferences, delegates selection to the agent without a user prompt, honors
stated preferences, and preserves an existing artifact's selected theme when
updating it unless asked to change or reroll. It forbids guessing from identity,
project category or OS. This policy ships in the mirrored skill, CLI help and
bilingual docs; runtime selection remains generation-time only.
