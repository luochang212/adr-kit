---
'adr-kit': patch
---

Require `adr/archived/MANIFEST.json` even when the archive is empty, so
`validate` reports a missing manifest instead of passing an empty directory,
and fail base-aware validation when the manifest exists at the base but cannot
be read, instead of treating an unreadable base as "no prior seals".
