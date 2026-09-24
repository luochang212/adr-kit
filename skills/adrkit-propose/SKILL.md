---
name: adrkit-propose
description: Use when starting an architectural choice that has not shipped, whether its direction is open or settled.
---

# ADR Kit Propose

Run `adrkit list` and read relevant records before opening a new choice. Use `adrkit propose "<title>"`; it creates a dated, unnumbered file in `adr/proposed/`. Fill Problem, Proposal, Alternatives considered, Acceptance criteria, and Risks with actual content. A settled direction stays proposed until shipped. An uncommitted file is a local working-tree draft; Git commit makes it shared. Run `adrkit validate <name>` and resolve missing requirements before formal review. Do not put provenance flags in proposal front matter; describe participants and reasoning in the body.
