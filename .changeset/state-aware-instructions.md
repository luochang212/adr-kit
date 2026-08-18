---
"adr-kit": patch
---

- `adrkit instructions` now reports readiness per pending proposal: each
  proposal is flagged as validated (ready to accept) or needing work, and
  `--json` adds `readyToAccept` and `needsWork` next to `pending`. Pending
  proposals are no longer hidden by unrelated validation issues elsewhere in
  the repository.
- Agent skills for propose/accept/supersede now instruct agents to re-query
  the repository state at decision points instead of trusting session
  memory.
