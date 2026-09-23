---
status: accepted
date: 2026-09-24
raised-by: agent
decided-by: human
created: 2026-09-24
commit: e999c3a
tags: [agent-integration, decision-process]
---

# ADR: 17 Defer the task-end decision self-check behind archive evidence

## Problem

An integration review asked how agents can be brought to record decisions
proactively during ordinary (vibe) coding. Worth-fix verification shipped
three of six candidates — a CI validate gate, an archive-time decision
inventory, and a standing-orders note — and rejected two on evidence. One
candidate survived scrutiny but resisted a verdict: a task-end self-check
asking whether the task just settled a decision worth recording.

The gap it targets is real. The standing orders (the "Reading architecture
decisions" section pasted into AGENTS.md) govern recording with a continuous
rule only — they rely on the agent noticing a decision-shaped choice
mid-task. Nothing asks again when the task ends, and an unrecorded decision
produces no failure signal any gate can catch: `validate` stops records that
were written badly, never records that were never written.

Every placement had a different cost structure, and none was mechanically
enforceable: "task end" does not exist in the CLI's world — the CLI sees
commands, not sessions — so the check can only live in prose the agent
reads, and its benefit is a behavioral probability no local test can
measure.

## Decision

- **Defer the closing check in every form** — the standing-orders template
  sentence, the `adrkit instructions` terminal-state line, and the
  AGENTS.md↔template sync test — until the archive-guidance experiment
  earns evidence. That experiment is already running and needs no
  instrumentation: `openspec/config.yaml` guides archiving with a decision
  inventory, delivered through a channel the archive demonstrably reads
  (`openspec instructions archive` feeds operation guidance into the
  agent's context).
- **The evidence gate is visible in this repository's git history.** If the
  next two or three openspec archives show inventory actions — an ADR
  recorded from the change, or an explicit "checked adr/, nothing to
  record" — prose nudges work here and the template sentence goes in. Two
  consecutive archives with no inventory trace falsify the channel, and the
  check stays out.
- **Why not ship the infrastructure half now** (the agent's recommendation,
  overridden — see Deliberation): the `instructions` line is product
  surface, not repository hygiene. It would ship an unvalidated nudge to
  every CLI user — the same class of mistake as adding promotion lines to a
  hot path. The sync test is zero-risk but also zero-urgency: it only earns
  its keep the day the template changes, a day this deferral postpones.
- **Why defer at all**: the check's benefit is unverifiable locally, while
  its costs are real and distributed — an attention tax every task pays for
  a benefit that collects rarely, and two failure modes (mechanical
  "nothing settled" noise, ritual-driven record inflation) that would
  undermine the recording balance the template already strikes. Adding the
  template sentence now would also confound the running experiment: after
  the fact, a recorded decision could no longer be attributed to the
  guidance or to the sentence.

## Alternatives considered

- **A closing-check sentence in the standing-orders template now**:
  rejected for now. It rides the proven channel at one sentence of cost,
  but it confounds the archive-guidance experiment and spends constitution
  density before the effect is measurable. Revisit through the evidence
  gate above.
- **A line in `adrkit instructions`' terminal state now**: rejected. The
  state ("nothing pending") fits the moment, but no agent-facing mechanism
  brings agents to that surface — the nine skills and the template never
  mention the command, only the docs do — and the line would ship to all
  users regardless of that reach.
- **A dogfood sync test (the root AGENTS.md carries the current template
  block) now**: deferred with the rest. It copies the docs-mirror pattern
  and protects the channel's integrity, but it belongs in the commit that
  next changes the template, whenever that is.
- **Platform Stop hooks (e.g. Claude Code)**: rejected. A task-end trigger
  the platform enforces is the strong form of this check, but it is
  per-platform and unportable across the agents the `.agents/` convention
  serves; the template sentence is its portable approximation.
- **A marker-managed AGENTS.md block the CLI writes and refreshes** (the
  full version behind the shipped standing-orders note): rejected. It
  crosses the ownership line `adrkit update` draws — only its own files —
  against a failure mode never observed: this repository's pasted section
  matched the template byte for byte, and the current OpenSpec ships skills
  the same way rather than rewriting root instruction files.

## Consequences

- The standing orders keep no task-end checkpoint. Capture rests on the
  continuous recording bar, grilling sessions (ADR 4 records their output
  unconditionally), and the archive guidance.
- The evidence window is the next two or three openspec archives in this
  repository. The signal is observable in git history, so the revisit is a
  reading task, not a measurement project.
- The template↔AGENTS.md sync stays a manual discipline; no test enforces
  it yet.
- A future proposal for the closing check starts from this record instead
  of re-deriving the trade-off.
- Provenance: the review put the check and its option space on the table,
  and the maintainer chose full deferral over the agent's
  ship-the-infrastructure-half recommendation, so `raised-by` is `agent`
  and `decided-by` is `human`.

## Deliberation

- Defer the task-end decision self-check behind archive evidence [settled]
  - Q: Which integration enhancements survive verification? [settled]
    - A: Ship the CI validate gate, the archive inventory, and the standing-orders note [settled] — mechanism-verified, low cost
    - A: Add Chinese trigger phrases to the skill descriptions [rejected] — no observed misses, and the effect cannot be tested locally
    - A: Hint at visualization after decide and accept [rejected] — the record is an empty shell at that moment, and validate's OK is a hot path
    - Q: Where can the remaining candidate — a task-end check — live? [settled]
      - A: A sentence in the standing-orders template [settled] — the proven channel; the whole cost is one sentence of constitution
      - A: A line in instructions' terminal state [settled] — the right moment on a half-dead surface
      - A: Platform Stop hooks [rejected] — the strong form, but per-platform and unportable
      - A: The archive-guidance channel [settled] — an existing structured moment; shipped first and doubles as the experiment
      - Q: When does the closing check ship? [settled]
        - A: Ship the sync test and instructions line now; gate the template sentence on evidence [rejected] (recommended) — the agent's recommendation, overridden: the nudge is product surface aimed at every user without evidence, and infrastructure without its feature is noise
        - A: Defer every form until the archive guidance shows inventory behavior [settled] — the maintainer's call; keeps the natural experiment unconfounded and pays no attention tax on a hypothesis
