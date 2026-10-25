---
"adr-kit": minor
---

Ship two named full-atlas themes: Folio (warm paper/editorial) and Signal
(dark/instrumental), with matching offline, bilingual map and reading features.
Use `--theme folio|signal` to choose, or `--theme random` (also the default)
to choose with equal probability once at generation. The HTML keeps that theme;
there is no system appearance detection or page switch. Standalone maps and
deliberation trees reject `--theme`.

Refresh Folio’s responsive three-column directory and improve reader
provenance/reference layouts in both themes. Both themes now keep the reader's
source link in the sticky header: Folio styles it as a quiet padded control and
Signal keeps its original text link. Preserve Signal’s original
page styling and opening without hero actions. Fix range hover masking and interactive SVG semantics,
and add browser accessibility and navigation regression checks. Lock the page's
own scrollbar while the reader modal is open, so it no longer renders beside
the reader's as a second, dead scrollbar on browsers with persistent
scrollbars.
