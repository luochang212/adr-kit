---
status: implemented
date: 2026-09-20
raised-by: human
decided-by: human
created: 2026-09-20
commit: 78fc95f
tags: [provenance, grilling, record-format]
---

# ADR: 3 model provenance and grilling output as first-class

## Problem

ADR 1 shipped grilling as a workflow skill but left its output ephemeral: the
design tree is discarded and the record keeps only a distilled result, so the
evidence behind `decided-by` — which recommendations the human overrode and
which they let through — evaporates. The record also carries a single
provenance axis, `decided-by`, so it cannot say who put a decision on the
table as distinct from whose judgment settled it. Finally, the skill routed
grilling into both `decide` and `propose`, but the documentation treats
`decide` as the default path and proposals as the exception, and grilling's
confirmation gate already requires the decision owner — so a proposal re-opens
a decision the session settled.

## Decision

- **Provenance is two flat, orthogonal fields.** Keep `decided-by: human |
  agent` (whose judgment settled the choice) and add a required `raised-by:
  human | agent` (who put the decision on the table). `decide` and `accept`
  require both flags; the CLI neither infers nor verifies either, and
  `supersede` preserves both. No `provenance:` nesting.
- **A grilling session defaults to one ADR.** Its design tree is stored as an
  optional structured outline in a `## Deliberation` appendix — never as
  mermaid source. `adrkit tree <N>` renders that outline to mermaid or text
  on demand. The task-start reading rule treats the appendix as reference
  material, not part of the mandatory full read, so trees do not tax every
  task's context.
- **Grilling terminates in `adrkit decide` only.** The `grill → propose →
  accept` path is removed. A session that genuinely settles independently
  supersedable decisions may still produce several records, linked by the
  session.
- **Product surfaces lead with the default.** Because `decide` is the common
  path, `adrkit instructions`, the `init` hints, and the website demo lead
  with `decide`; `propose` stays supported but is presented as the exception.

## Alternatives considered

- **Delete `decided-by` and keep only `raised-by`**: rejected. It loses the
  trust axis: readers could no longer tell whether a person actually
  determined the direction or merely let an agent's choice through.
- **One mixed `type`/`method` enum (`grill | direct | proposal`)**: rejected.
  It conflates deliberation (grilling) with lifecycle path (direct versus
  draft), so it cannot express "grilled, then proposed"; grilling is
  orthogonal to the path.
- **Store the design tree as mermaid source**: rejected. Mermaid is a view;
  long questions make it unreadable and hard to diff. `adrkit graph` already
  derives mermaid/dot/text from records rather than storing a rendered form.
- **Keep `grill → propose`**: rejected. Grilling's confirmation gate requires
  the decision owner, so shared understanding means the decision is settled;
  filing a proposal re-opens it.
- **Namespaced `provenance:` block**: rejected. It adds parser, validator, and
  graph complexity for no gain over flat fields, against the format's
  plain-Markdown philosophy.

## Consequences

- The record format breaks: `raised-by` becomes required on durable records,
  so `adr.ts`, `validate.ts`, `templates.ts`, `decide`/`accept`/
  `supersede`, README, `docs/record-format.md` (English and Chinese), and
  tests change together, and ADR 1, 2, and this record are migrated.
- A new `adrkit tree` command renders `## Deliberation`; the init reading
  rule, `docs/workflow.md` (English and Chinese), and this repository's
  `AGENTS.md` carve the appendix out as optional.
- `adrkit instructions` and the website demo lead with `decide`; `propose`
  remains a supported exception.
- The `adrkit-grill` skill drops `propose`, declares `raised-by`, and writes
  the deliberation appendix.
- This is a breaking change to a 0.x package. Per ADR 2's dogfooding and the
  project's 0-star, self-only use, compatibility is not a constraint; it ships
  as a minor changeset rather than a migration shim.

## Deliberation

- Model provenance and grilling output as first-class [settled]
  - Q: Should a grilling session be a persisted entity? [settled]
    - A: Do not persist it; keep only the distilled ADR [rejected]
    - A: Embed the tree in the ADR, defaulting one session to one record [settled] (recommended)
    - A: A separate session object with an id, allowing 1:N [rejected] — deferred until 1:N is the norm
  - Q: What provenance axes does a record carry? [settled]
    - A: Keep the single-axis decided-by [rejected]
    - A: Replace it with one method enum grill/direct/proposal [rejected] — conflates deliberation with lifecycle path
    - A: Keep decided-by and add the orthogonal raised-by [settled] (recommended)
    - A: Delete decided-by and keep only raised-by [rejected] — loses the trust axis
  - Q: How is the design tree stored? [settled]
    - A: Do not store it [rejected]
    - A: Store mermaid source [rejected] — mermaid is a view, not a source
    - A: Store a structured nested outline and render it on demand [settled] (recommended)
  - Q: Where does grilling terminate? [settled]
    - A: Keep grill to propose to accept [rejected] — re-opens a settled decision
    - A: End in adrkit decide only [settled] (recommended)
  - Q: How many ADRs per session? [settled]
    - A: Split every independent sub-decision into its own ADR [rejected]
    - A: Default one session to one ADR, with an escape hatch [settled] (recommended)
