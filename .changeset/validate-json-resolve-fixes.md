---
"adr-kit": patch
---

- `adrkit validate <name>` now checks that a `superseded by N` reference
  points at an existing decision that is not itself superseded; previously
  only a repository-wide `validate` caught dangling references.
- Commands without JSON output now reject `--json` with an error instead of
  silently printing human-readable output.
- `adrkit show <name>` and `adrkit validate <name>` now work when an
  unrelated record fails to parse; the corrupt file is still reported by a
  repository-wide `validate`.
