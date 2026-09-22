---
"adr-kit": patch
---

Fix defects found in a whole-repository review (report at
`docs/reviews/2026-09-23-whole-repository.md`). `adrkit tree --text` and
`--mermaid` now agree with `--html` on the override signal; a bracketed state
word inside prose is no longer consumed as a marker; a reason splits on the
first ` — `. `supersede` refuses a replacement that is not an accepted decision
and refuses to drop an unknown front-matter key. `list` and `instructions` no
longer fail when `adr/config.yaml` is malformed, and the drift notice ignores a
stamp that is not a parseable version. Commands reject options they do not take
(for example `--out` outside `graph`). `check:upstream` verifies the vendored
grilling copies against the manifest.
