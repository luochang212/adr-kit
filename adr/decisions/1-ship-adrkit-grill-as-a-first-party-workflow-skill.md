---
status: accepted
date: 2026-09-20
decided-by: human
created: 2026-09-20
commit: 83ac493
tags: [skills, agent-integration, decision-process]
---

# ADR: 1 ship adrkit-grill as a first-party workflow skill

## Problem

Grilling — interrogating the user about a decision until nothing is left
silently assumed — is the upstream half of ADR Kit's pipeline: every existing
workflow skill polishes the record (format, lifecycle, validation), none
improves the decision the record describes. The method exists only as a
third-party skill (mattpocock/skills, MIT): generic, unaware of `adr/`
records, and ending in conversation rather than a record. Three questions
shaped adoption: at which layer it becomes first-class, copy versus adapt,
and how to keep the ADR importance bar.

## Decision

Ship an adapted `adrkit-grill` workflow skill: `skills/adrkit-grill/SKILL.md`,
mirrored into `WORKFLOWS` in `src/core/tool-integrations.ts` (canonical order
after `init`, before `propose`), installed by every `adrkit init`/`update` and
selectable via `--workflows`. The design-tree/frontier method is kept and
credited to mattpocock/skills (MIT). The session feeds the record: root
questions map to `## Problem`, rejected frontier options to
`## Alternatives considered`, the user's answers to `## Decision`, unlocked
branches to `## Consequences`; who overrode whom feeds `decided-by` and its
body nuance. The ADR importance bar is restated in the skill so trivial
choices get neither grilling nor a record. No CLI command: interrogation
stays conversational, in the skill layer.

## Alternatives considered

- **CLI command (`adrkit grill`)**: rejected. The CLI is a record manager; an
  interactive interrogation flow would break the layering that keeps
  `src/core/` console-free and `yaml` the only runtime dependency.
- **Verbatim fork of the upstream skill**: rejected. It is generic — it does
  not read `adr/` records, and it ends in notes rather than
  `adrkit decide`/`adrkit propose`.
- **Documentation-only recipe**: rejected. A README note wastes
  `adrkit init`, the distribution channel that is the product's point.
- **Side-by-side, no product change**: rejected. The provenance synergy — a
  grill session makes "did the human override the recommendations"
  observable, which is exactly what `decided-by` declares — only pays off
  when the skill itself routes into the records.

## Consequences

- Integrations now ship eight workflow skills; `--workflows` accepts
  `grill`; README and `docs/cli.md` updated; minor bump via changeset.
- `test/integrations.test.ts` enforces the byte-exact mirror plus content
  assertions for the method, the attribution, and the CLI endpoints.
- Grill sessions end in `adrkit decide`/`adrkit propose` with `decided-by`
  declared from the session: `human` when the user's answers set the
  direction, `agent` when every recommendation was adopted without
  engagement.
- This record is the first written through the new pipeline: the adoption
  was grilled (one round, three questions with recommended answers), and the
  maintainer approved the recommendations unchanged. Direction raised and
  confirmed by the maintainer; scope and shape proposed by the agent — hence
  `decided-by: human`, with this note as the provenance nuance.
