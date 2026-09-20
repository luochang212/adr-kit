---
"adr-kit": minor
---

Add the `adrkit-grill` workflow skill, shipped by every integration and
selectable through `--workflows`. It interrogates the user about an
important architectural decision (design tree, frontier rounds) until
nothing is silently assumed, then records the settled decision with
`adrkit decide`/`adrkit propose`, mapping the session's questions,
rejected options, and overrules onto the record sections and `decided-by`.
Method adapted from the `grilling` skill in mattpocock/skills (MIT).
