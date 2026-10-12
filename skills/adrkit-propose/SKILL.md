---
name: adrkit-propose
description: Use when you catch yourself settling a choice future work must live with — a dependency, format, boundary, or default — and adr/ does not already own it; the work is unshipped and the direction may be open or settled.
---

# ADR Kit Propose

A proposal is drift insurance: the cheapest durable home for a choice future tasks must inherit, written before the context that raised it evaporates.

Before writing, run `adrkit list` and search the active records — read relevant implemented records in full, and check proposed records for intent and rejected ones for the bad cases they warn against — for anything covering the same choice, mechanism, or rejected alternative. Judge overlap from record content, not titles or tags; the CLI cannot infer it. Classify what you find:

- **Duplicate**: extend the existing record instead of opening a new one.
- **Full replacement**: write the new record, then resolve the old one in the same change with `adrkit supersede --by`; never leave duplicate active authority.
- **Partial replacement**: write the new record, keep the older one active, refresh the facts that remain current in it, and link the two records in prose.
- **Independent**: proceed without touching unrelated records.

Then run `adrkit propose "<title>"`; it creates a dated, unnumbered file in `adr/proposed/`. Fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run `adrkit validate <name>` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.
