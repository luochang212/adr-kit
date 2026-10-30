---
name: adrkit-propose
description: Use when an unshipped choice has important constraints or reasons that existing sources do not preserve, especially context held only in conversation; assess whether it merits a proposal.
---

# ADR Kit Propose

A proposal preserves important context for an unshipped choice before that context evaporates.

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


Before writing, run `adrkit list` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Read `adr/notes.md` too — its unshaped lines are the likeliest raw material for this record. Judge overlap from record content, not titles alone; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: create a proposal linking the decision it will replace; keep the implemented decision active until the replacement ships. After shipping, use `adrkit implement` and resolve the old decision with `adrkit supersede --by` in the same delivery change. A proposal is intent, not duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Then run `adrkit propose "<title>"`; it creates a dated, unnumbered file in `adr/proposed/`. Write a one-sentence description explaining when to read the record, then fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run `adrkit validate <name>` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.
