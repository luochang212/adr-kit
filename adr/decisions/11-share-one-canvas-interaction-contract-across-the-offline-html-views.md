---
status: accepted
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: 651c064
tags: [visualization, agent-integration, interaction]
---

# ADR: 11 Share one canvas interaction contract across the offline HTML views

## Problem

The two `--html` views were asymmetric. The deliberation card tree was an
interactive canvas with folding, pan, zoom, fit-to-view, 1:1, and keyboard
navigation; the decision map was a static SVG picture. The same flag produced two
different classes of artifact, and the map could not be read comfortably once a
repository grew wide. Trackpad pinch on the card tree also triggered browser
zoom rather than canvas zoom, because the wheel handler deliberately let
`ctrl`/`meta` through, and the existing zoom centered on the viewport instead of
the pointer. The maintainer asked for a pointer-anchored pinch zoom and for the
two views to behave consistently wherever the difference is not inherent to
their content.

## Decision

- Extract one shared canvas controller, `src/core/canvas-view.ts`, that both
  HTML views embed: pan (drag, scroll, two-finger), zoom (buttons and keyboard),
  fit-to-view, 1:1, and arrow-key navigation.
- A trackpad pinch arrives as a `ctrlKey` wheel event; it zooms the canvas
  anchored at the pointer, so the point under the cursor stays put. A plain wheel
  pans. This is the maintainer's requested gesture.
- The decision map becomes an interactive canvas under the same controller.
  Folding stays a deliberation-tree feature: the map has no tree to fold and its
  date columns already scope the view.
- Keep the content differences. The card tree answers how one decision's
  deliberation unfolded; the map answers how decisions relate. The shared part
  is the interaction contract, not the feature set.
- Intercepting `Ctrl/⌘ + scroll` inside the canvas replaces browser zoom there.
  The canvas provides its own zoom plus keyboard and buttons, and browser zoom
  still works outside the canvas.

## Alternatives considered

- **Duplicate the interaction code in each view**: rejected. Two copies drift,
  which is exactly the inconsistency this removes.
- **Force full feature symmetry by adding folding to the map**: rejected. The
  map has nothing to fold and its columns already group by creation date, so the
  difference is inherent content, not a missing capability.
- **Leave the map static**: rejected. The same `--html` flag should mean the
  same class of artifact, and a wide static map is hard to read at scale.
- **Keep `Ctrl/⌘ + scroll` for browser zoom**: rejected by the maintainer's
  request; the canvas gesture is the expected one, and keyboard and buttons keep
  zoom reachable without it.

## Consequences

- One module owns the interaction; both views embed it, and any future HTML view
  reuses the contract instead of re-implementing it.
- The map now carries one inline script. It remains a single self-contained file
  with no external script, no CDN, and no network request.
- Browser zoom inside the canvas is replaced by canvas zoom. This is a deliberate
  accessibility trade-off, mitigated by keyboard navigation and the zoom
  buttons, and it does not affect the rest of the page.
- The decision-graph and deliberation-tree specs gain a pointer-anchored pinch
  scenario; the map's tests assert the canvas structure and the pinch handler.

## Deliberation

- Keep the two offline HTML views consistent [settled]
  - Q: Are the two `--html` views symmetric? [settled]
    - A: No; the card tree leads on interaction and the map on navigation and scope [settled]
    - A: Yes, they already match [rejected] — the map had no script or controls
  - Q: How far should consistency go? [settled]
    - A: Share one interaction contract and keep the content differences [settled] (recommended)
    - A: Force identical feature sets [rejected] — the views answer different questions
    - A: Leave the map static [rejected] — the same flag would give different classes of artifact
  - Q: How should a trackpad pinch behave? [settled]
    - A: Zoom the canvas anchored at the pointer [settled] (recommended)
    - A: Keep handing it to browser zoom [rejected] — the maintainer asked for canvas zoom
  - Q: What happens to `Ctrl/⌘ + scroll`? [settled]
    - A: It zooms the canvas at the pointer, and a plain scroll pans [settled] (recommended)
    - A: Reserve it for browser zoom [rejected] — the canvas provides its own zoom and keyboard
