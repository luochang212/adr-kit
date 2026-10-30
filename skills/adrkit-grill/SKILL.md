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

Preserve important context missing from existing sources. Honor explicit user requests to preserve a choice without making similar edits record-worthy.

Before creating or shaping a record, ask:

1. **What would be lost?** Find a constraint, reason, or genuine trade-off that code, tests, and existing documentation do not reliably explain, especially context held only in a user conversation. An implementation result alone is insufficient.
2. **What would forgetting cost?** Identify a plausible future mistake and its consequences. Weigh importance and breadth of impact; a local decision with severe consequences can qualify. Do not invent disasters to justify recording.
3. **What should survive?** Preserve the stable choice, boundary, and reason. Consider longevity and resistance to becoming stale separately; leave volatile facts to code, configuration, tests, or existing docs.

Use judgment, not a score or an all-must-pass checklist. If nothing meaningful would be lost, skip without a justification field, user approval, or deferred note. Notes are candidates, not commitments to ADRs.

| Usually leave to existing sources | Potentially worth preserving |
| --- | --- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden |
| Selected a library; the manifest already shows which one | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable |

Judge information, not topic names; an existing record is not precedent for recording similar edits. Update only claims made false by a change; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest moving details to their existing owner or authorized archival when the rationale no longer guides work. Do not silently rewrite choices, ignore constraints, delete a record, or archive it without authorization.


Apply the same selection judgment after grilling; discussion alone does not require a record. If no outcome qualifies, summarize the conclusions in conversation and create no record. When an outcome qualifies, preserve the complete session tree in its Deliberation appendix, including local choices as context rather than separate ongoing obligations. Usually one primary record holds the tree; split only qualifying choices that can be superseded independently. An unshipped outcome goes to `adrkit propose`, even when the direction is settled. Fill `## Problem`, `## Proposal`, `## Alternatives considered`, `## Acceptance criteria`, and `## Risks` from actual answers. Keep the tree in an optional `## Deliberation` appendix: prefix questions `Q:`, options `A:`, tag nodes `[settled]`, `[rejected]`, or `[open]`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use `adrkit record` with truthful `--raised-by` and `--decided-by` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with `adrkit supersede --by` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles alone. Run `adrkit validate <name>` after filling the record. Report which outcomes are proposals, not implemented guidance; `adrkit implement` is reserved for work that actually ships.
