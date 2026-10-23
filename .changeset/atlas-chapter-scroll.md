---
"adr-kit": patch
---

Stop restarting chapter-navigation smooth scrolling on every page scroll update. Bring a chapter into view only when it becomes active and is outside the navigation viewport; honor reduced-motion preferences. This removes redundant motion in narrow decision-atlas navigation without changing page-scroll or canvas gestures.
