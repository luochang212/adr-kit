---
status: implemented
date: 2026-10-29
description: "Read when placing stability promises and release-specific upgrade instructions in project documentation."
raised-by: human
decided-by: human
created: 2026-10-29
commit: 522df0c
paths:
  - README.md
  - README.zh.md
  - docs/README.md
  - docs/zh/README.md
  - docs/upgrading.md
  - docs/zh/upgrading.md
  - AGENTS.md
---

# ADR: 43 Separate the upgrade guide from the README stability note

## Problem

ADR 28 made the README upgrade section one of the surfaces where a break states
itself, and the section has since grown to four dense paragraphs sitting between
Quick start and every feature section of both READMEs. It mixes three kinds of
content: the compatibility stance (one paragraph), per-release break notes (the
0.30.0 validation tightening, the atlas consolidation, the CLI strictness, the
Node.js floor, the package and command naming, the manifest removal), and
standing-orders marker mechanics. Only the stance is adoption-critical. The rest
is reference material that grows with every release and duplicates the
changelog, which already carries the same breaks per version, and the position
interrupts the what/why/how narrative a first-time reader is still evaluating.

Origin: the maintainer questioned why an updates section sits so early in the
README and approved splitting it, requiring the remaining note to move later in
the file; the concrete section layout is the agent's.

## Decision

Split the surface ADR 28 named and keep its announcement duty unchanged:

- `README.md` and `README.zh.md` keep a short `## Stability` / `## 稳定性`
  section: no forward-compatibility promise, `adrkit update` then
  `adrkit validate --all` as the supported path, and archived records changing
  only through deliberate, explained commits — plus links to the upgrade guide
  and the changelog. It moves after the Record format section and before
  Sources of inspiration: the product story completes before the maintenance
  contract appears.
- The per-release notes move to `docs/upgrading.md` and
  `docs/zh/upgrading.md`, newest first: the 0.30.0 validation tightening, the
  standing-orders marker mechanics, the atlas consolidation, the package,
  command, and Node.js facts, the CLI strictness, and the manifest removal.
  Both docs index pages list the guide.
- `AGENTS.md`'s local surface list names the README stability note and the
  upgrade guide instead of the README upgrade section. The canonical
  standing-orders template is untouched, so the generation marker stays.

ADR 28 stays active: the stance, the upgrade path, and the
announce-where-users-meet-it duty are unchanged. This record partially
replaces ADR 28's realization; the amendment is recorded through
`### Later changes`, and ADR 30 and ADR 33 get the same pointer because their
realization facts name the old location.

## Alternatives considered

- Keep the section where it is. Rejected: the README's front half keeps
  accumulating changelog detail, and the growth is unbounded; ADR 28's own
  reasoning assigns after-the-fact detail to surfaces read at failure time,
  not to the adoption front door.
- Drop the README note entirely and rely on `docs/upgrading.md` and the
  changelog. Rejected: ADR 28's ground stands — the README is where an
  adopter meets the tool first, and a break warning at adoption time is the
  cheapest place to state it; a changelog entry is read after the failure.
- Supersede ADR 28. Rejected: its decision — publish the stance, announce
  breaks at the surfaces users meet, treat upgrading as the supported path —
  remains the active authority; only the home of the running notes changes,
  which is a partial replacement, and partial replacement keeps the older
  record active.

## Consequences

### Verification

- `README.md` and `README.zh.md` contain a `## Stability` / `## 稳定性`
  section stating the three stance sentences and linking the upgrade guide and
  the changelog; the `## Upgrades` / `## 升级` sections are gone.
- The Stability section sits between the Record format section and Sources of
  inspiration in `README.md`, and between 记录格式 and 灵感来源 in
  `README.zh.md`.
- `docs/upgrading.md` and `docs/zh/upgrading.md` carry the per-release notes
  (0.30.0 validation tightening, marker mechanics, atlas consolidation,
  package/command/Node.js, CLI strictness, manifest removal), newest first,
  and `docs/README.md` plus `docs/zh/README.md` list them.
- `AGENTS.md` names the README stability note and the upgrade guide in the
  standing-orders surface list; the canonical template and the generation
  marker are unchanged.
- ADR 28, ADR 30, and ADR 33 carry `### Later changes` entries naming the new
  locations; ADR 33's legacy `## Later changes` section is converted to the
  documented `###` form.
- `adrkit validate --all`, `npm run typecheck`, and `npm test` pass.

### Trade-offs

- The stability note is less prominent than the old top-of-README section, and
  a skimming adopter may miss it. Accepted: the note stays in the reference
  band before the closing sections, and the guide and the validation errors
  carry the duty the shorter note no longer can.
- External links to the README `#upgrades` anchor break. The content survives
  in the guide and the changelog.
- The guide is one more document to update when a release breaks. The
  standing orders already instruct agents to state a break where users meet
  it, and the surface list now names the guide explicitly.

