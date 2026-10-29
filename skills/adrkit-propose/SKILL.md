---
name: adrkit-propose
description: Use when you catch yourself settling a choice future work must live with — a dependency, format, boundary, or default — and adr/ does not already own it; the work is unshipped and the direction may be open or settled.
---

# ADR Kit Propose

A proposal is drift insurance: the cheapest durable home for a choice future tasks must inherit, written before the context that raised it evaporates.

Before writing, run `adrkit list` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Read `adr/notes.md` too — its unshaped lines are the likeliest raw material for this record. Judge overlap from record content, not titles alone; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: create a proposal linking the decision it will replace; keep the implemented decision active until the replacement ships. After shipping, use `adrkit implement` and resolve the old decision with `adrkit supersede --by` in the same delivery change. A proposal is intent, not duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Ground factual observations in code you inspected (file:line or a symbol), a source link, or an attributed participant statement. Distinguish observations, inferences, and unknowns; code shows what exists, not why an alternative lost. Do not invent reasons or alternatives to fill a template. Keep unsupported rationale unknown and clarify it before presenting it as settled. If excerpts are truncated or a session does not match the change window, state the limitation rather than silently attaching it. Preserve available source anchors in ordinary Markdown within the existing sections; no new required field or section. Git identity, model identity, and passive approval do not establish who decided.

Then run `adrkit propose "<title>"`; it creates a dated, unnumbered file in `adr/proposed/`. Write a one-sentence description explaining when to read the record, then fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run `adrkit validate <name>` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.
