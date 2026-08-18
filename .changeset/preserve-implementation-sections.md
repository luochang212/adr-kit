---
"adr-kit": patch
---

- `adrkit accept` no longer drops extra proposal sections that have a place
  in an accepted decision — for example `## Implementation` holding a PR or
  review link. They are preserved verbatim, appended after the canonical
  `## Consequences` section, so a lifecycle move can never lose written
  content silently. Only proposal-era leftovers (`Plan`, `Migration plan`)
  are still dropped, and the existing warning still names them.
