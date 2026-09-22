---
"adr-kit": patch
---

Give a decision-map card's tags the whole footer row, cut where they reach the
card edge, and let the map's drawing box grow to hold the connecting curves, so
a long backward edge is drawn in full rather than clipped at the map's edge.
The box is sized to the curves themselves rather than to their control points,
which used to leave the map floating in a frame nearly twice the width of its
card grid.
