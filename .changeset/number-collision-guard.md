---
"adr-kit": minor
---

Protect numbered writes with an exclusive per-number lock and check both `implemented/` and `archived/` before writing. Concurrent `adrkit record`/`adrkit implement` writers fail with a retryable error instead of creating duplicate numbers, and new implemented records cannot overwrite the same filename. Archive staging retains its same-name write behavior. Document interrupted-lock recovery and the scope of this protection. The bilingual READMEs and CLI reference now describe validation coverage, including single-record reference and seal checks.
