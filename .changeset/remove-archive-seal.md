---
"adr-kit": minor
---

Remove the archive seal and manifest. `archived/` is ordinary Git-tracked history, validated by the current format; `archive` and `supersede` just move the record. `adrkit validate --base` is removed, and an existing `adr/archived/MANIFEST.json` is no longer read.
