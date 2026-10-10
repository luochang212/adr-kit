---
"adr-kit": minor
---

Report invalid types in known configuration fields during repository validation. Explain partial completion and recovery when archive or supersede seals a record but cannot remove its active source.

Repositories that leave a known field empty (`tools:`, `rules:`) or mistyped now fail `adrkit validate --all` until the field is corrected or removed; previously the invalid value was silently ignored.
