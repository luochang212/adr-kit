---
status: implemented
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-24
commit: 9cfada4
tags: [record-lifecycle, agent-integration, governance]
---

# ADR: 18 Organize records by proposal and shipped lifecycle

## Problem

ADR Kit currently stores committed decisions together in `decisions/` and
keeps proposals in a gitignored `.drafts/` directory. A rejected proposal is
deleted. `accepted` means the choice was recorded, not that it shipped. This
layout cannot distinguish work still being shaped from shipped guidance, keep
the rationale for a formal rejection, or retire low-future-value guidance
without confusing it with supersession. It also makes every task read the
entire decision set, including historical records. The maintainer chose to
adopt the lifecycle discipline of DeepSeek Harness Agent Notes while keeping
ADR Kit's provenance, deliberation, stable decision numbers, and graph.

## Decision

- The repository has four lifecycle directories: `proposed/`,
  `implemented/`, `rejected/`, and `archived/`, with no class subdirectories or
  `.drafts/`. `proposed/` holds unshipped work, including choices settled by a
  grilling session. An uncommitted proposal is a working-tree draft; a commit
  makes it shared. `implemented/` means the decision actually shipped, not
  merely that someone chose or approved it.
- `propose` creates a dated, unnumbered proposal. `reject` requires a reason
  and preserves every formally rejected proposal in `rejected/`. `implement`
  promotes a shipped proposal, rewrites proposal-era sections as present-tense
  decision and consequences, and assigns the next ADR number. `record` writes
  an already-shipped decision directly into `implemented/` with that number.
  The CLI does not infer whether work shipped; the caller declares the move.
- A grilling session records every choice it settles, but an unshipped result
  remains in `proposed/`, with the settled direction, alternatives,
  deliberation, and provenance in its body. It does not become an implemented
  ADR merely because the questioning ended. This changes the terminal route
  in ADRs 3 and 4 while retaining their provenance and deliberation rules.
- Implemented records may be updated to keep paths, symbols, defaults, and
  other realization facts aligned with shipped code. Their choice and
  rationale are not rewritten into another decision; a changed choice needs
  a new record and an explicit relationship. Full supersession moves the old
  record to `archived/`, preserving its number and `superseded-by` link.
  Partial supersession leaves the still-relevant record active and links the
  related decisions instead.
- Only implemented records enter `archived/`. An implemented decision may be
  archived when its distinct rationale is unlikely to guide future work,
  current behavior has another authoritative owner, and the record still has
  historical value. Archive is frozen history and not current authority;
  supersession is one archive reason, not the only one. Records are never
  archived by age or quota. Numbers are assigned only on entry to
  `implemented/` and remain stable in `archived/`; proposed and rejected
  records retain dated filenames.
- Agent instructions first discover the active inventory, then read the
  relevant implemented records in full and check relevant proposed and
  rejected records. Archived records are read only for historical context.
  Relevance is not determined from titles alone. `tags` remain the thematic
  classification; no additional class directory is introduced.
- This is the new product contract, not a compatibility layer. Existing
  commands, templates, integrations, documentation, and repository records
  change together. OpenSpec is not part of the runtime or governance design.

## Alternatives considered

- **Keep decisions in `decisions/` and only change the display**: rejected.
  The filesystem would still conflate chosen, shipped, rejected, and retired
  work, leaving agent discovery and repository review with the old model.
- **Use `implemented/` for a settled but unshipped choice**: rejected. That
  makes the directory's central claim false. DeepSeek Harness uses it for
  shipped decisions, which is the meaning chosen here.
- **Add a fifth `accepted/` directory or a second accepted status within
  `proposed/`**: rejected. The chosen direction can be stated in a proposal's
  body and provenance without another lifecycle state. The four-directory
  inventory remains legible.
- **Keep `.drafts/` for uncommitted work**: rejected. Git already distinguishes
  an uncommitted working file from a shared proposal; a separate store adds a
  move and an extra set of lookup rules.
- **Discard rejections or retain only selected rejections**: rejected. Every
  formally rejected proposal gets an explicit, durable outcome. Scratch
  thoughts and losing options within a decision are not formal proposals.
- **Require supersession before archival**: rejected. A shipped record can
  lose forward guidance without being replaced; it may be sealed when current
  authority exists elsewhere. Conversely, a partial replacement does not
  justify removing remaining active constraints.
- **Read every implemented record at every task start**: rejected. The
  retained proposal and rejection corpus makes universal full reads scale
  poorly. Inventory-first discovery and relevant full reads keep the actual
  obligations while bounding context.
- **Add lifecycle and class subdirectories together**: rejected for now.
  The lifecycle axis solves the present problem; `tags` already provide
  cross-cutting themes. A second path taxonomy has no demonstrated need.
- **Preserve old command and file compatibility**: rejected by the maintainer
  for this self-used pre-stable repository. Keeping obsolete concepts would
  weaken the new model and add code without current users to protect.

## Consequences

The file layout, status validation, repository readers, command surface,
numbering, graph paths, lifecycle skills, standing orders, bilingual docs,
website examples, and tests must change as one contract. The new inventory
distinguishes work in progress, shipped guidance, rejected proposals, and
sealed history without treating approval as delivery. Git records proposal
collaboration; the CLI records declared lifecycle moves but cannot prove code
was shipped or that an archive has no remaining forward value. The
maintainer raised the direction, chose the four-directory lifecycle, kept
every formal rejection, removed local drafts and compatibility requirements,
and confirmed this design after reviewing the alternatives.
