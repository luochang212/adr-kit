---
status: implemented
date: 2026-11-15
description: "Editing the shared recording guidance (tool-integrations) or judging a borderline choice worth recording: the four questions now end in a named veto, user-ruled values stay code-held, and the leave-to-sources table covers interaction and feature-spec floods."
raised-by: agent
decided-by: human
created: 2026-11-15
paths:
  - src/core/tool-integrations.ts
  - skills/**
  - docs/workflow.md
  - docs/zh/workflow.md
---

# ADR: 54 Name the veto test in the recording guidance and hedge user-ruled values

## Problem

A consuming repository accumulated roughly thirty interface and feature-spec
records in three weeks, and a 2026-11 audit retired a third of the inventory
as below the line. The four-question test (ADR 52) slowed the flood but two
gaps stayed open, both visible in the records that still leaked after 0.36.0:

- Question 3 asks whether the reason is "hidden and durable enough to guide
  future choices", but never forces the writer to name what the record stops.
  A user's mid-session preference is hidden, so "the user asked for uniform
  panel widths" passes Q3 and ships as a record that vetoes nothing the
  shared constant and its test do not already veto.
- The "honor explicit user requests" sentence and the recording-evaluation
  case bless recording whatever a user ruled, with no hedge for the largest
  leak class: user-ruled interface forms and interaction details, three of
  which were archived below the line within days of their ruling.

The leave-to-sources table named upgrades, button styling, and library picks —
none of the categories that actually flooded: interaction and layout
unification, motion boundaries, and feature-spec records whose Verification
list restates the commit message.

## Decision

The shared `RECORDING_GUIDANCE` (single editing source
`src/core/tool-integrations.ts`, exported to `adrkit-propose`,
`adrkit-record`, and `adrkit-grill`) changes in three places:

- After the four questions, the guidance asks the writer to name the concrete
  future change this record would veto; a reason that stops nothing a failing
  test or the compiler would not stop anyway is taste or completion, not
  constraint, and is not recorded. The probe stays prose-shaped after the
  questions, not a scored fifth item, so the existing "judgment, not a
  checklist" instruction stands.
- The user-request sentence now states its boundary: a user-ruled interface
  form or interaction detail is still code-held; the ruling is recorded when
  it changes a recorded choice or closes a class of future work, not when it
  sets a value.
- The leave-to-sources table gains the observed flood rows: unified widths,
  tab bindings, and motion boundaries on the left; a conversation-only ruling
  that closes a whole class of future work on the right; feature-spec
  write-ups with verification lists on the left; a production failure mode
  that shaped the feature on the right.

`docs/workflow.md` gains the counterpart procedure: after a release that
raises the bar, regrade the stock — keep, supersede or archive, or delete —
so the bar governs the inventory, not only the inflow.

## Alternatives considered

- **Fold the probe into question 3's wording**: rejected. Burying it keeps
  the failure mode it names invisible; the leak came from Q3 being answerable
  in the abstract, and the probe works by demanding a concrete object.
- **Restate the bar in the AGENTS.md awareness section**: rejected. The
  section is user-owned, kept under three hundred characters, and already
  points at the skills; duplicating the test there costs the budget for an
  unproven marginal surface, and the skills load exactly when the decision is
  being made.
- **Age- or quota-based decay for stale proposals and records**: rejected.
  The lifecycle already rules out archiving by age or quota; disposition
  stays an event, and the propose workflow now names closing a dead proposal
  in the change that kills it.

## Consequences

The regenerated skills carry the probe into every new repository and every
`adrkit update`; `test/integrations.test.ts` holds exports to the source.
Trade-offs: wording cannot stop a determined writer — every leaked record of
the flood would have answered the probe with something — so this is a
sharpening of the judgment point, not a gate; the mechanism-level
counterweights are the regrade procedure and the checked removal path (ADR
55). The probe's phrase "vetoing work" also lands in the generated
`adr/README.md` (ADR 55's rewrite) so a new agent meets the bar before the
lifecycle rules.
