---
'adr-kit': patch
---

Carry the review method in the `adrkit-review` skill: reproduce a finding against the real code path before calling it confirmed, leave the failing scenario as an assertion under `test/`, and treat a failed reproduction as a narrowed claim rather than proof of absence. A confirmed defect is not yet a fix — weigh trigger probability, blast radius, fix cost, and the cost of leaving it, and state plainly a true finding left unfixed. The standing orders add one clause: when an active record's mechanism is itself unsound, weigh removing it rather than patching it.
