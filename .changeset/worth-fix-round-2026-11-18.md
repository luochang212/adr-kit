---
"adr-kit": patch
---

Worth-fix round following the 2026-11-18 whole-repository review:

- `adrkit reject` and `adrkit implement` now resolve a healthy proposal while
  an unrelated record elsewhere fails to parse, matching the corrupt-tree
  fallback the other resolvers already honor; the promotion itself still
  refuses, naming the corrupt file, because number allocation needs the whole
  inventory.
- `adrkit help` and `adrkit version` reject stray positional arguments instead
  of silently ignoring them, as docs/cli.md already promised for every command.
- `adrkit supersede --by ""` reports "supersede requires --by <name>" instead
  of the misleading "no ADR matches \"\"".
- The adrkit-visualize skill no longer cites adr-kit's internal decision
  number inside text shipped to user repositories.
- The homepage terminal demo shows the placeholder form of the provenance
  flags and is now pinned to real command output by a test.
