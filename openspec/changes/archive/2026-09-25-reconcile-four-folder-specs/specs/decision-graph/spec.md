# Spec Delta

## MODIFIED Requirements

### Requirement: Mermaid graph output

`adrkit graph` SHALL emit a Mermaid `flowchart` document of all numbered
decisions in the repository. Nodes SHALL be labeled with the decision number
and title, and each node SHALL link to its record file with a
repository-relative path. Records that are retired — `status: superseded`, or
archived without a supersession — SHALL be visually distinct from active
implemented records, drawn with the same retired dashed, gray styling.

#### Scenario: default invocation emits Mermaid

- **WHEN** `adrkit graph` runs inside a repository with at least one implemented decision
- **THEN** the output starts with `flowchart` and contains one node per decision, labeled with its number and title

#### Scenario: node click target

- **WHEN** the Mermaid output contains a node for decision `N`
- **THEN** a `click` statement points at the record's path under `adr/implemented/`

#### Scenario: superseded styling

- **WHEN** a decision has `status: superseded`
- **THEN** the Mermaid output assigns it a styling class distinct from implemented decisions

#### Scenario: archived record styling

- **WHEN** a numbered record in `adr/archived/` is not superseded
- **THEN** the Mermaid output assigns it the same retired (dashed, gray) styling class as a superseded record, distinct from active implemented decisions

## ADDED Requirements

### Requirement: reads only numbered decisions

`adrkit graph` SHALL build the graph from the numbered decisions in
`adr/implemented/` and `adr/archived/` only; proposals in `adr/proposed/` and
rejected records in `adr/rejected/` MUST NOT appear because they carry no
number. The command SHALL require an ADR Kit repository and fail with the
standard not-initialized error otherwise. An unparseable record SHALL fail the
command with that record's parse error, consistent with `adrkit list`.

#### Scenario: unnumbered records excluded

- **WHEN** a repository has one implemented decision and one pending proposal
- **THEN** the graph contains exactly the decision's node

#### Scenario: outside a repository

- **WHEN** `adrkit graph` runs in a directory with no ADR Kit repository
- **THEN** the command exits non-zero with the init hint

## REMOVED Requirements

### Requirement: reads only durable decisions

**Reason**: Its heading and scenarios named `adr/decisions/` and `adr/.drafts/`, which the four-folder lifecycle removed.

**Migration**: Replaced by `reads only numbered decisions` above, which reads `adr/implemented/` and `adr/archived/` and excludes the unnumbered `adr/proposed/` and `adr/rejected/` records.
