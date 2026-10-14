---
name: adrkit-grill
description: Use when a decision is still being shaped, or the user asks to grill a plan; interrogate the design against the active records until no branch is silently assumed, and record every settled choice.
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

Record every choice the session settles; the session is the importance signal. Usually one primary record holds the tree, but split choices that can be superseded independently. An unshipped outcome goes to `adrkit propose`, even when the direction is settled. Fill `## Problem`, `## Proposal`, `## Alternatives considered`, `## Acceptance criteria`, and `## Risks` from actual answers. Keep the tree in an optional `## Deliberation` appendix: prefix questions `Q:`, options `A:`, tag nodes `[settled]`, `[rejected]`, or `[open]`, nest a follow-up beneath what raised it, mark the recommended option, and give rejected options a reason.

State who raised and settled the unshipped choice in prose; proposal front matter has no provenance fields. If the choice has already shipped, use `adrkit record` with truthful `--raised-by` and `--decided-by` declarations. Compare each settled choice with the active records before recording: a full replacement of an implemented decision is recorded and then resolved with `adrkit supersede --by` in the same change, a partial replacement keeps the older record active and links both, and a duplicate extends the existing record. Judge overlap from content; the CLI cannot infer it from titles or tags. Run `adrkit validate <name>` after filling the record. Report which outcomes are proposals, not implemented guidance; `adrkit implement` is reserved for work that actually ships.
