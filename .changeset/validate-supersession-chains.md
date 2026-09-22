---
"adr-kit": patch
---

Allow successive supersession chains to pass repository and single-record
validation without rewriting historical links. Detect missing downstream targets,
cycles, and chains that do not terminate at an accepted decision.
