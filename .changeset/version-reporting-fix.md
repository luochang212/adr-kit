---
"adr-kit": patch
---

- Fix `adrkit --version` reporting a stale hardcoded version: the CLI now
  reads the version from package.json, which changesets bump on every
  release. `adrkit --version` / `adrkit version` will no longer lie about
  the installed package.
- Synchronize the Chinese docs with the current behavior: the record-format
  status line now includes `superseded by NNNN`, the workflow docs cover
  superseding, and the `instructions` command description reflects the
  state-aware output. Normalize the `repository.url` to the `git+` form npm
  expects.
