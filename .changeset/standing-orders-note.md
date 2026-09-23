---
"adr-kit": minor
---

`adrkit init` and `adrkit update` print a note when neither AGENTS.md nor
CLAUDE.md carries the standing-orders section ("Reading architecture
decisions"): the integration files are installed, but agents read adr/ at
task start only if that section has been pasted in. The check is read-only
(the CLI never rewrites the instruction file), and an explicit
`--tools none` opt-out stays quiet.
