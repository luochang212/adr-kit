---
name: adrkit-record
description: Use when recording an already-shipped architectural decision directly, without a pending proposal.
---

# ADR Kit Record

First run `adrkit list` and read relevant implemented records. Confirm the choice has actually shipped; the CLI cannot verify delivery. If an unshipped proposal exists, use it rather than recording a duplicate. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
