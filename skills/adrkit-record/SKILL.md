---
name: adrkit-record
description: Use when a shipped choice has important constraints or reasons that existing sources do not preserve; assess whether to record that missing context directly.
---

# ADR Kit Record

Recording a shipped choice preserves important context that later tasks could otherwise lose.

## Is this worth recording?

ADR Kit is the agent's notebook, not a log of everything it changes. Use judgment; choosing not to record is a valid outcome. Respect an explicit user request to preserve a choice, but do not turn it into a rule to record every similar edit.

Before creating or shaping a record, ask yourself:

1. **What would be lost?** Identify a constraint, reason, or genuine trade-off that code, tests, and existing documentation do not reliably explain. A requirement mentioned only in a user conversation is especially easy to lose; an implementation result alone is not enough.
2. **What would forgetting cost?** Name a plausible future mistake and its consequences. Weigh importance and breadth of impact; a local decision with severe consequences can qualify too. Do not invent a hypothetical disaster to justify a record.
3. **What should survive?** Preserve the stable choice, its boundary, and why it matters. Weigh longevity and resistance to becoming stale separately: a long-lived page can have constantly changing spacing. Let code, configuration, tests, or an existing document own volatile facts.

These are judgment dimensions, not a score or an all-must-pass checklist. If there is no meaningful information to preserve beyond existing sources, skip the record. Do not add a justification field, ask the user to approve every skip, or create a note merely to defer that conclusion. A note is candidate memory, not an obligation to produce an ADR.

| Usually leave to existing sources | Potentially worth preserving |
| --- | --- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden |
| Selected a library; the manifest already shows which one | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable |

Judge the actual information, not these topic names. During maintenance, an existing record is not precedent for recording similar edits. A change inside its implementation freedom needs no ADR update unless a claim the record actually makes becomes false. Keep required paths and references valid. If volatile details force repeated synchronization, report the specific burden and suggest trimming those details to their existing owner or archiving the record when its distinct rationale no longer guides work. Do not silently rewrite the choice, ignore an explicit constraint, delete a record, or archive it without authorization.


First run `adrkit list` and read relevant implemented records in full; also check proposed records for intent and rejected records for the bad cases they warn against. Compare content, not titles alone — the CLI cannot infer semantic overlap. A duplicate means recording the choice in the existing record instead; a full replacement means recording the new decision and resolving the old one with `adrkit supersede --by` in the same change; a partial replacement keeps the older record active with a prose link between them.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Confirm the choice has actually shipped, and compare its claimed paths, names, defaults, and mechanisms with the current code and tests; the CLI cannot verify delivery. If a code change altered only the realization of an active decision, update facts the existing record actually claims rather than recording a new one; changes within its implementation freedom need no update. A changed recorded choice needs a new record and an explicit relationship. Run `adrkit record "<title>" --raised-by <human|agent> --decided-by <human|agent>`. Write a one-sentence description explaining when to read the record, then fill Problem, Decision, Alternatives considered, and Consequences with the shipped choice and genuine trade-offs. Use `human` for a person's judgment, `agent` for the agent's; passive human approval does not change an agent-origin choice. Run `adrkit validate <N>`.
