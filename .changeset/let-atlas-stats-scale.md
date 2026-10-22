---
'adr-kit': patch
---

The decision atlas's stat numerals track the page hierarchy again. The template shipped with an unconditional `font-size: 24px` override sitting on top of an unreachable `clamp(36px, 4.5vw, 52px)` rule, pinning the numbers at 24px on every screen; the override is gone and the clamp is rescaled to `clamp(28px, 3.5vw, 44px)` so the numerals stay below the hero title and section headings. Phones keep their pinned size.
