---
"adr-kit": minor
---

Read citation validation from the files Git carries, and refuse retirements
that would strand a citation.

- Repository-wide `@adr N` scanning reads tracked files plus untracked files no
  ignore rule excludes, and falls back to walking the directory only when Git
  cannot describe it. An ignored build output or a local copy of another
  checkout is no longer scanned, so it can neither slow validation down nor
  fail it with a citation this repository never made.
- `adrkit archive` and `adrkit supersede` refuse while code still cites the
  decision, listing each `path:line` and leaving the record tree untouched,
  instead of reporting success and leaving the next `validate` failing on
  citations the command itself stranded. `supersede` also refuses a `--by`
  decision numbered lower than the record it replaces, which could only write a
  backwards chain.
- The decision map removes the legend panel with its last entry instead of
  framing nothing, and keeps the dock controls in the trailing corner. The
  opening view keeps the top rim, so a map or tree shorter than the canvas
  starts at its first line rather than floating mid-canvas, and the timeline
  axis no longer claims `(UTC)` for a date stamped from local time.
