## MODIFIED Requirements

### Requirement: formal supersede edges

The graph SHALL draw one edge per `superseded-by` front matter field, from
the superseded decision to its replacement, labeled as a supersession. In
Mermaid output the edge SHALL be styled with a long-dash stroke pattern via
a `linkStyle` statement so it reads as a distinct-but-subtle relationship,
consistent with the project website's decision graph. The `==>` edge
syntax, direction, and label remain unchanged; only the stroke is overridden.

#### Scenario: supersede edge is drawn

- **WHEN** decision 1 carries `superseded-by: 11`
- **THEN** the output contains a supersession-labeled edge from node 1 to
  node 11

#### Scenario: supersede edge is drawn as long dashes in mermaid

- **WHEN** `adrkit graph --mermaid` runs and decision 1 carries
  `superseded-by: 11`
- **THEN** the output contains the `==>|superseded by|` edge from node 1 to
  node 11 and a trailing `linkStyle` statement applying a long-dash pattern
  to that edge

#### Scenario: reference edges keep their default style

- **WHEN** `adrkit graph --mermaid` output also contains mined reference
  edges (`-.->`)
- **THEN** no `linkStyle` statement restyles the reference edges; only the
  formal supersede edges receive the long-dash override

#### Scenario: supersede styling applies per edge index

- **WHEN** a repository has multiple supersede edges
- **THEN** each supersede edge receives its own `linkStyle` statement
  indexed to its declaration order, and no two linkStyle statements target
  the same edge
