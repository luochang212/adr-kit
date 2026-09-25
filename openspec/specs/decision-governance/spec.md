# decision-governance Specification

## Purpose

Makes ADR Kit's installed agent workflows keep new and existing decision records aligned with one another and with the behavior that actually shipped.

## Requirements

### Requirement: New records receive a scoped supersession review

The installed `propose`, `record`, and `grill` workflows SHALL search active records about the same choice, mechanism, or rejected alternative before creating a new record. They SHALL distinguish a duplicate, a full replacement, a partial replacement, and an independent choice. A known full replacement SHALL resolve the older record in the same change; a partial replacement SHALL retain the still-relevant record and link both records. The workflow SHALL NOT claim that the CLI can infer semantic overlap from titles or tags alone.

#### Scenario: Full replacement is identified while writing a record

- **WHEN** an agent writes a new record that fully replaces an implemented decision
- **THEN** its workflow directs the agent to record the replacement, validate it, and supersede the old decision in the same change

#### Scenario: Partial replacement retains active guidance

- **WHEN** only part of an implemented decision is replaced
- **THEN** the workflow keeps the older record active, updates facts that remain current, and links the decisions without archiving it

#### Scenario: No overlapping record exists

- **WHEN** a scoped search finds no record covering the same choice or mechanism
- **THEN** the agent may proceed without creating an empty supersession entry or changing unrelated records

### Requirement: Delivery workflows compare records with shipped behavior

The installed `implement` and `record` workflows SHALL require the agent to compare the decision's claimed paths, names, defaults, mechanisms, and verification evidence with current code and tests before presenting it as implemented. When a code change alters only the realization of an active decision, the agent SHALL update those facts in the existing record without rewriting its choice or rationale. A changed choice SHALL use a new record and an explicit relationship.

#### Scenario: Proposal becomes implemented

- **WHEN** a proposal's work has shipped and the agent invokes the implementation workflow
- **THEN** the agent checks the resulting record against shipped code and tests, replaces proposal-era sections with present-tense facts, and validates the numbered record

#### Scenario: File move preserves the same decision

- **WHEN** a code change moves an implementation file named in an active decision without changing that decision
- **THEN** the agent updates the file path in the active record in the same change rather than creating another decision

### Requirement: ADR review is a focused installed workflow

ADR Kit SHALL install a selectable review workflow that checks changed records against the changed code and tests, searches for stale active records and unresolved full or partial supersession, and reports evidence-backed findings. It SHALL be scoped to decision-record coherence, not generic code review. It SHALL treat a disagreement with a decision as a design question rather than silently rewriting the historical rationale.

#### Scenario: Review finds a stale active record

- **WHEN** a change renames a documented default and leaves its active ADR unchanged
- **THEN** the review workflow reports the mismatch and identifies the current code evidence

#### Scenario: Review finds no decision-record issue

- **WHEN** a change leaves relevant decisions and their realization facts current
- **THEN** the workflow reports no ADR finding instead of requiring a new record for a mechanical edit
