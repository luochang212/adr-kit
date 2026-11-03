---
status: implemented
date: 2026-10-12
description: "Read when designing how agents notice settled choices and capture them without interrupting their current task."
raised-by: agent
decided-by: agent
created: 2026-10-12
paths:
  - src/core/notes.ts
  - src/commands/note.ts
  - src/commands/list.ts
  - src/commands/instructions.ts
  - src/core/tool-integrations.ts
  - skills/adrkit-note/SKILL.md
  - skills/adrkit-propose/SKILL.md
  - skills/adrkit-record/SKILL.md
  - skills/adrkit-grill/SKILL.md
  - AGENTS.md
  - adr/README.md
  - README.md
  - README.zh.md
---

# ADR: 21 capture decisions at the settle moment through purpose-bound surfaces and a note buffer

## Problem

The reading and recording rules assume an agent knows what `adr/` exists to
prevent and recognizes the settle moment; an agent that merely has ADR Kit
installed has neither. Right-moment recording decomposes into notice ×
associate × cheap-enough, and the surfaces fail the last two.

Association fails because every exposure surface speaks tool vocabulary rather
than the agent's situation. The standing orders open with an instruction
("run `adrkit list` at task start") and never state the two failure modes the
tool blocks: drifting from settled decisions, and forgetting them until they
resurface as inconsistencies. Capture skill descriptions are category phrases
("an architectural choice that has not shipped"), so the agent must first
classify its situation into the tool's category — exactly where mid-task
misses happen.

Cheap-enough fails because every legal capture action is shaped: `propose`
demands five sections under a validation gate, and `grill` interrogates the
user. An agent that notices and associates still faces a detour, rationally
defers, and deferral is where capture dies. A worth-fix measurement confirmed
an empty `propose` fails validation, while `record` is worse mid-task — one
title lands an empty record in `implemented/` and burns a number.

## Decision

Two coordinated moves, both shipped.

**Phase 1 — purpose-bound, situation-mirrored surfaces.** One framing sentence
at the top of the standing-orders template binds the tool to its failure modes:
`adr/` exists because agents over-focus on the current task and forget settled
decisions; reading counters the drift, recording when a choice settles
counters the forgetting. One line per surface, varied wording, no new action.
Capture-side skill descriptions (`propose`, `record`, `grill`) are rewritten in
situational language mirroring the agent's state. The purpose line also appears
at the top of each skill body, in the generated `adr/README.md`, and in
`adrkit instructions`; the template and `skills/` stay byte-mirrored.

**Phase 2 — a zero-shape note buffer.** `adrkit note "<one line>"` appends a
timestamped line to `adr/notes.md`, creating it on first use. It is a plain
file: no front matter, no template, no lifecycle semantics, and `validate`
ignores it; it is explicitly not a fifth folder (ADR 18). `adrkit list` and
`adrkit instructions` surface an unshaped-note count, and `grill`/`propose` read
the buffer as candidate material. The quality gate stays where it is: shaping
through `propose`/`grill`/`record` keeps the five-section bar and validation
failures as success signals, so capture is separated from shape rather than
weakening it.

## Alternatives considered

- **Copy layer alone**: rejected. Awareness that meets a five-section detour
  still defers; the legal action must cost one line.
- **Note buffer alone**: rejected. An agent that never associates never
  invokes it; the triggering description is part of the association layer.
- **Lower the propose/record bar**: rejected. It trades away the contract that
  validation failures are success signals; separate capture from shape instead.
- **Fold in ADR 17's task-end check**: rejected. It is separately owned
  follow-through with its own closed evidence gate.
- **Platform Stop hooks or mechanical triggers**: rejected per ADR 17's
  portability analysis.
- **A path-keyed retrieval surface (`adrkit why <path>`)**: rejected for now.
  Constraint-level decisions constrain files they never name, and an empty
  result licenses skipping. Revisit if dogfooding shows read-misses.

## Consequences

### Verification

- Phase 1: the standing-orders template, `INIT_README`, `instructions` output,
  and every skill body carry one purpose line each with no verbatim
  duplication; capture descriptions are situational; the template and
  `skills/` remain byte-mirrored; the repository's own `AGENTS.md` and
  `adr/README.md` are refreshed; a test pins the framing line through template
  regeneration.
- Phase 2: `adrkit note` has a round-trip test covering append, the `list`
  count, and `instructions`; `validate` ignores `adr/notes.md`; completion
  includes the subcommand; both READMEs document it; `grill` and `propose`
  reference the buffer.
- Both phases: `npm test`, `adrkit validate --all`, and
  `npm run check:upstream` pass.

### Trade-offs

- **Constitution density.** The framing line can become noise; mitigated by
  one line per surface, varied wording, and no new action.
- **Description drift.** Situation-mirrored descriptions must stay
  retrieval-honest; the sync test pins both sides.
- **The buffer becomes a graveyard.** The count is surfaced in `list` and
  `instructions`, and deleting a buffer line is cheap unlike a hollow record.
- **Attribution.** New awareness surfaces muddy behavioral reads of the
  archive experiment; that window already closed positive.
- **Scope.** Phase 2 adds a command, but the primitive is append, count, and
  surface over a plain file.

### Later changes

**Amended by ADR 45:** ADR 45 refines capture triggers to important context missing from existing sources and applies information-value selection before shaping notes. Notes are candidate memory, not an obligation to produce ADRs; routine events need no note. Purpose-bound surfaces and the one-line buffer remain, with no new lifecycle state or CLI quality gate.

## Deliberation

- Q: What does right-moment recording require? [settled]
  - A: notice × associate × cheap-enough [settled] — prior decisions covered neither back term
    - A: association alone [rejected] — deferral dies at the five-section gate
    - A: friction alone [rejected] — no trigger without association
    - A: both, phased [settled] — copy first, command second; each stands alone
    - Q: Where does association live? [settled]
      - A: retrieval keys plus one framing line per always-on surface [settled]
        - A: an AGENTS.md essay [rejected] — density
        - A: code-comment anchors [rejected] — invasive and dual-maintained
    - Q: Cheapest legal capture action? [settled]
      - A: one-line append to a non-lifecycle buffer [settled]
        - A: a flag-gated `propose` [rejected] — weakens the validation contract
        - A: hand-written scratch files [rejected] — same friction, no surfacing
      - Q: Does the buffer get lifecycle semantics? [settled] — no: a plain file, or it becomes a fifth folder against ADR 18
- Q: Exact wording of the mirrored descriptions? [open] — maintainer review against trigger honesty
- Q: Does Phase 2 wait for dogfood evidence? [settled] — no: the archive window closed positive (three archives, three inventory actions), and each phase stands if the other is struck
