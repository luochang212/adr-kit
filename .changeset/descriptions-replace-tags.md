---
"adr-kit": minor
---

Replace free-form decision tags with a required, single-line `description` explaining when a record is relevant. Inventory and scope results show the description, lifecycle moves preserve it, and atlas directories, readers and search use it.

Breaking: remove `tags` from records and author their descriptions, including archived records in an explained migration commit. The `atlas --tag` filter is removed without an alias. Maps now distinguish current decisions from archived history through lifecycle colors, text and dashed styling, with no category palette to maintain. Fresh templates intentionally fail validation until the description and required sections are filled.

Clarify first-time setup, integration refresh and later-session reading in the README and CLI help. The instructions command now reminds installed integrations to merge missing standing orders into AGENTS.md while respecting explicit opt-outs and preserving user-owned files.
