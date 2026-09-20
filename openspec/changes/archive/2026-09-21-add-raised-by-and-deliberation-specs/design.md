## Context

See proposal.md - Why. The behavior shipped in 0.9.0 (ADRs 3 and 4); this change
only brings the live specs in line with it. No source changes.

## Goals / Non-Goals

**Goals:**
- Record `raised-by` and the `## Deliberation` / `adrkit tree` behavior as
  requirements the existing code already satisfies.

**Non-Goals:**
- Changing any code, schema, template, or dependency.
- Specifying the grilling workflow itself (a skill contract under `skills/`) or
  the upstream-pin CI gate (a development process, not product behavior).

## Decisions

- **A new `deliberation-tree` capability rather than extending
  `decision-graph`.** `decision-graph` is the repository-wide relationship
  graph; the tree renderer visualizes one record's deliberation. Different
  inputs and outputs, so a separate capability keeps each purpose honest.
- **ADDED requirements for `raised-by` instead of a renamed requirement.** The
  axes are independent, so leaving the `decided-by` requirements intact keeps
  the delta reviewable.
- **MODIFIED only where an existing requirement's behavior changes:** the draft
  prohibition (now both fields), validation-never-writes (now both), and the
  documentation requirement (now both axes). The Purpose is edited in the main
  spec directly, per the OpenSpec workflow.

## Risks / Trade-offs

- [The specs drift again on the next format change] -> the AGENTS.md "Record
  format is the product" checklist now names the parser and the bilingual
  references as part of the change surface.
