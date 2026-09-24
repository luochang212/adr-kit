---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

Run `adrkit init [path]` for a new repository, or `adrkit update` if `adr/` exists. Confirm the four lifecycle folders: `proposed/`, `implemented/`, `rejected/`, and `archived/`. The CLI installs workflow skills but does not rewrite a project's standing orders.

Add or update this section in `AGENTS.md` (and `CLAUDE.md` when used):

## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run `adrkit list`. Discover the active inventory, then read relevant implemented records in full with `adrkit show <N>` or their files. Check relevant proposed and rejected records; consult archived records only for history. Do not judge relevance by title alone: inspect tags, paths, relationships, and task scope. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a `## Deliberation` appendix only when its decision is in play.

Record an ADR when an architectural choice constrains future work and its rationale is not evident from code. Record genuine alternatives and trade-offs, not invented template filler. A grilling session records every choice it settles, but unshipped outcomes remain proposals. Use `adrkit propose` for unshipped work, `adrkit implement` after it ships, and `adrkit record` for an already-shipped decision. `raised-by` declares who introduced the choice; `decided-by` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.
