---
'adr-kit': minor
---

Make the AGENTS.md paste awareness-only and multilingual, and remove the
generation marker (ADR 52, superseding ADR 35): the section agents add to
`AGENTS.md` now names the adrkit commands and the record-worthiness bar —
whether and when to run them is the agent's judgment — and ships in Chinese
(the ≤300-character canonical source) and English, translated from the
Chinese, with more languages translating from Chinese. The `<!-- adrkit: standing-orders <id> -->` marker
and its drift note are gone; old markers in your AGENTS.md are inert comments
you can delete at will, and template changes are announced in the upgrade
guide instead. Refresh installed integrations with `adrkit update`.
