---
'adr-kit': minor
---

Make Signal the default atlas theme and demote random to an opt-in fair coin
(ADR 51, superseding ADR 42): omitting `--theme` renders Signal
deterministically — regenerating the same atlas no longer flips its theme —
while `--theme random` rolls a fair 50/50 coin between Folio and Signal once
at generation. Workflows that relied on re-running the CLI to re-roll the
theme must now pass `--theme random` explicitly, and installed agent
integrations should be refreshed with `adrkit update`.
