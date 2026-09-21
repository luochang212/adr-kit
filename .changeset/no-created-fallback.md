---
"adr-kit": patch
---

`adrkit graph` no longer substitutes a decision's status date for a missing
`created` field. The record format requires `created` and `validate` already
rejects a record without it, so the view now names the invalid record instead of
grouping it under a fabricated birth date.
