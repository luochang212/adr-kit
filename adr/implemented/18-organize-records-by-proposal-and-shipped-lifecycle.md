---
status: implemented
date: 2026-09-25
description: "Read when deciding whether a choice belongs in a proposal, active record, rejection, or archive and when to assign its number."
raised-by: human
decided-by: human
created: 2026-09-24
paths:
  - adr/**
  - src/commands/propose.ts
  - src/commands/reject.ts
  - src/commands/implement.ts
  - src/commands/record.ts
  - src/commands/archive.ts
  - src/commands/supersede.ts
  - src/core/repository.ts
  - src/core/templates.ts
  - src/core/validate.ts
  - src/core/tool-integrations.ts
  - skills/adrkit-init/SKILL.md
  - skills/adrkit-propose/SKILL.md
  - skills/adrkit-implement/SKILL.md
  - skills/adrkit-record/SKILL.md
  - skills/adrkit-reject/SKILL.md
  - skills/adrkit-archive/SKILL.md
  - skills/adrkit-supersede/SKILL.md
  - skills/adrkit-grill/SKILL.md
  - README.md
  - README.zh.md
  - docs/record-format.md
  - docs/zh/record-format.md
  - docs/workflow.md
  - docs/zh/workflow.md
  - site/src/components/Lifecycle.astro
---

# ADR: 18 Organize records by proposal and shipped lifecycle

## Problem

ADR Kit stored committed decisions together in `decisions/`, kept proposals in
a gitignored `.drafts/`, and deleted rejected proposals; `accepted` meant the
choice was recorded, not that it shipped. The layout could not distinguish work
still being shaped from shipped guidance, preserve a rejection's rationale, or
retire low-value guidance without conflating it with supersession, and it made
every task read the whole set. The maintainer adopted the lifecycle discipline
of DeepSeek Harness Agent Notes while keeping ADR Kit's provenance,
deliberation, stable decision numbers, and graph.

## Decision

- Four lifecycle directories: `proposed/`, `implemented/`, `rejected/`, and
  `archived/`, with no class subdirectories or `.drafts/`. `proposed/` holds
  unshipped work, including choices settled by grilling; an uncommitted
  proposal is a working-tree draft and a commit makes it shared.
  `implemented/` means the decision actually shipped, not that someone chose
  or approved it.
- `propose` creates a dated, unnumbered proposal. `reject` requires a reason
  and preserves the proposal in `rejected/`. `implement` promotes a shipped
  proposal, rewrites proposal-era sections as present-tense decision and
  consequences, and assigns the next number. `record` writes an
  already-shipped decision directly into `implemented/`. The CLI does not
  infer that work shipped; the caller declares the move.
- A grilling session records every choice it settles, but an unshipped result
  stays in `proposed/` with its direction, alternatives, deliberation, and
  provenance. It does not become an implemented ADR because questioning
  ended; this changes the terminal route in ADRs 3 and 4 while keeping their
  provenance and deliberation rules.
- Implemented records may be updated to keep paths, symbols, defaults, and
  other realization facts aligned with shipped code. A changed choice needs a
  new record and an explicit relationship, not a rewrite of the old rationale.
  Full supersession archives the old record with its number and
  `superseded-by`; partial supersession leaves the still-relevant record
  active and links the decisions.
- Only implemented records enter `archived/`. Archiving fits a record whose
  distinct rationale is unlikely to guide future work, whose behavior has
  another authoritative owner, and which still has historical value; it is
  never done by age or quota. Supersession is one archive reason, not the
  only one. Numbers are assigned on entry to `implemented/` and stay stable.
- Agents discover the active inventory, read relevant implemented records in
  full, check relevant proposed and rejected records, and read archived
  records only for historical context. Relevance is not judged from titles
  alone; `tags` remain the thematic classification. This is a new product
  contract, not a compatibility layer: commands, templates, integrations,
  documentation, and records change together, and OpenSpec is outside the
  runtime and governance design.

## Alternatives considered

- **Keep `decisions/` and change only the display**: rejected. The filesystem
  would still conflate chosen, shipped, rejected, and retired work.
- **Put settled-but-unshipped choices in `implemented/`**: rejected. That
  makes the directory's central claim false.
- **Add a fifth `accepted/` directory or a second accepted status, or add
  class subdirectories**: rejected. The chosen direction fits in a proposal's
  body, and `tags` already provide cross-cutting themes.
- **Discard rejections or keep only selected ones**: rejected. Every formal
  rejection gets a durable outcome; scratch thoughts are not proposals.
- **Require supersession before archival**: rejected. Guidance can lose
  forward value without a replacement, and a partial replacement does not
  justify removing remaining active constraints.
- **Preserve old command and file compatibility**: rejected for this
  self-used pre-stable repository. Obsolete concepts would weaken the model.

## Consequences

The file layout, status validation, repository readers, command surface,
numbering, graph paths, lifecycle skills, standing orders, bilingual docs,
website examples, and tests change as one contract. The inventory
distinguishes work in progress, shipped guidance, rejected proposals, and
archived history without treating approval as delivery. Git records proposal
collaboration; the CLI records declared lifecycle moves but cannot prove code
shipped or that an archive has no remaining forward value. ADR 20 later
defined the folders by context value — current authority read in full, intent
to check, anti-pattern to check, and lowest-value history read only when
cited — and made a rejection durable until another record owns its warning.

### Later changes

**Amended by ADR 25:** promotion emits `### Verification` and `### Trade-offs`
under `## Consequences`, and validation rejects the proposal-era
`### Acceptance criteria` and `### Risks` headings there in implemented
records. The four folders, shipping boundary, and numbering are unchanged.

**Amended by ADR 44:** Descriptions replace theme tags as discovery metadata. The four lifecycle folders, numbering and shipping boundaries are unchanged.

**Amended by ADR 45:** ADR 45 replaces the requirement that every settled grilling choice be recorded. Only qualifying choices enter the existing lifecycle; a qualifying record keeps the complete tree, and a session with none ends in conversation. Maintenance updates claims a record actually makes; implementation freedom does not require synchronization. The four folders, shipping boundary, numbering and retirement rules remain unchanged.
