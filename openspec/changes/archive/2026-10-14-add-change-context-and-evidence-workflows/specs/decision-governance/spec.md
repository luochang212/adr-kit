# Decision governance delta

## ADDED Requirements

### Requirement: Authoring workflows preserve evidence boundaries

Installed grill/propose/record workflows SHALL ground factual observations in inspected code locations, source links, or attributed discussion; distinguish observations, inferences, and unknowns; and prohibit invented reasons or alternatives. Evidence SHALL use ordinary Markdown, not a required new field or section. User statements SHALL retain attribution; Git identity or approval SHALL NOT replace decision provenance.

#### Scenario: Code does not explain an alternative
- **WHEN** code shows the chosen implementation but no discussion explains a rejected alternative
- **THEN** the workflow keeps the rationale unknown and seeks clarification rather than inventing it

#### Scenario: Captured material is incomplete
- **WHEN** source excerpts are truncated or the session does not match the change window
- **THEN** the workflow exposes that limitation and does not present the material as settled evidence

### Requirement: Notes capture sources without becoming authority

The installed note workflow SHALL recommend an available source anchor and distinguish a settled choice from a candidate needing confirmation, while retaining one-line capture and optional evidence. It SHALL NOT infer delivery or decision provenance from the existence of a note.

#### Scenario: Source is available at capture time
- **WHEN** an agent parks a choice discussed in a PR or conversation
- **THEN** the workflow suggests retaining its source in the same line and later checking it before shaping

#### Scenario: No durable source is available
- **WHEN** an agent notices a choice without a link
- **THEN** it can still capture one line with attribution or an unknown marker and continue work

### Requirement: Co-design connects planned scope to actual change

Installed grill and review workflows SHALL use scoped retrieval for planned files or actual Git changes respectively, supplement it with inventory reading for unscoped decisions, and treat incomplete results as requiring follow-up. They SHALL distinguish existing constraints, changed assumptions, and conflicts before settling choices. Review SHALL distinguish record validity from evidence that code follows a decision.

#### Scenario: Planned scope changes during implementation
- **WHEN** actual changed files extend beyond the planned scope
- **THEN** review retrieves the actual change context and rechecks newly relevant decisions

#### Scenario: No scoped match is found
- **WHEN** retrieval returns no matches or has incomplete input
- **THEN** the workflow does not infer permission to ignore existing decisions
