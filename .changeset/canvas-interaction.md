---
"adr-kit": minor
---

Give both offline HTML views one shared interactive canvas: pan, zoom,
fit-to-view, 1:1, and keyboard navigation, with a trackpad pinch zoom anchored
at the pointer. `adrkit graph --html` becomes an interactive decision map
rather than a static picture, and `adrkit tree --html` gains the
pointer-anchored pinch. Inside the canvas, Ctrl/⌘ + scroll now zooms the canvas
instead of the browser; browser zoom still works outside it. See ADR 11.
