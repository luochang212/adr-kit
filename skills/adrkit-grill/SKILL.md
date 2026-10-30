---
name: adrkit-grill
description: Use when the user asks to grill a plan or an important decision needs interrogation; explore the design against active records, then preserve only outcomes worth recording.
---

# ADR Kit Grill

Grilling is the co-design checkpoint an agent deep in a task will otherwise skip: it forces the conversation between the plan and the long-term decisions before anything settles.

Interrogate the user until the design tree has no silently assumed branch. This method is adapted from mattpocock/skills (MIT). For viewing existing records, use `adrkit-visualize`; grilling does not generate HTML by default.

## Method

1. Run `adrkit list`. Read the relevant `implemented/` records in full, check the relevant `proposed/` records for intent and the `rejected/` records for the bad cases they warn against, and consult `archived/` only when a task cites history. Recheck the inventory even if this conversation read it earlier; do not reopen a settled choice without naming that change. `adr/notes.md` is the settle-moment buffer; read its unshaped lines as candidate material for the tree. As the tree takes shape, search the active records for anything covering the same choice or mechanism, so a settled direction lands in the right record rather than a duplicate.
2. Map root questions and their dependent questions. Work in rounds: ask every question on the currently answerable frontier, each with genuine options and your recommendation. A downstream question waits until its prerequisite is answered. Format questions as `Q1 - <title>` with a clear recommendation. Word each question so "yes" accepts your recommended answer.
3. Research repository and environment facts yourself. Do not ask the user for facts you can inspect. For planned files, run `adrkit relevant <path>...`, then use `adrkit show <name>` to read matching records. Supplement matches with inventory reading for unscoped decisions; resolve incomplete-search diagnostics, and never treat zero matches as permission to skip existing decisions. Identify constraints that still hold, changed assumptions, and conflicts before settling a branch. Recheck when scope changes. Let answers reshape the tree; record which option or question unlocked each follow-up.
4. Stop questioning only when the frontier is empty. State the proposed shared understanding and wait for the user's confirmation before acting or writing records.

## Evidence

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

## Recording

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


Apply the same selection judgment after grilling; discussion alone does not require a record. If no outcome qualifies, summarize the conclusions in conversation and create no record. When an outcome qualifies, preserve the complete session tree in its Deliberation appendix, including local choices as context rather than separate ongoing obligations. Usually one primary record holds the tree; split only qualifying choices that can be superseded independently. An unshipped outcome goes to `adrkit propose`, even when the direction is settled. Fill `## Problem`, `## Proposal`, `## Alternatives considered`, `## Acceptance criteria`, and `## Risks` from actual answers. Keep the tree in an optional `## Deliberation` appendix: prefix questions `Q:`, options `A:`, tag nodes `[settled]`, `[rejected]`, or `[open]`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use `adrkit record` with truthful `--raised-by` and `--decided-by` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with `adrkit supersede --by` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles alone. Run `adrkit validate <name>` after filling the record. Report which outcomes are proposals, not implemented guidance; `adrkit implement` is reserved for work that actually ships.
