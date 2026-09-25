---
'adr-kit': patch
---

Harden base-aware validation and refresh the generated guidance.

- `adrkit validate --base <git-ref>` now fails when the base ref carries no
  readable `adr/archived/MANIFEST.json`, instead of treating it as having no
  prior seals.
- A project `context` in `adr/config.yaml` that starts with an HTML comment is
  now injected into new templates instead of being skipped.
- The generated `adr/README.md`, the standing-orders guidance, and the installed
  skills now describe the four lifecycle folders as a context budget and
  `rejected/` as durable anti-pattern memory.
