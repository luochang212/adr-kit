---
'adr-kit': minor
---

Adds `created` and `tags` to the record front matter. `created` is stamped
once at record creation and never re-stamped, so the time axis survives
later lifecycle moves (a superseded record keeps its birth date). `tags`
is an optional kebab-case keyword list that lets `adrkit graph` group and
filter decisions by theme. The graph now groups by `created`, tints
Mermaid nodes by their first tag, adds `--tag <tag>` filtering, and a
terminal-friendly `--text` tree output.
