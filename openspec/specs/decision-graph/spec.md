## Purpose

Generate a visual relationship graph of the decisions in an ADR Kit
repository so the evolution of the architecture (what superseded what, what
builds on what, when decisions clustered) is legible without opening every
record.

## Requirements

### Requirement: Mermaid graph output

`adrkit graph` SHALL emit a Mermaid `flowchart` document of all decisions in
the repository. Nodes SHALL be labeled with the decision number and title,
and each node SHALL link to its record file with a repository-relative path.
Records with `status: superseded` SHALL be visually distinct from active
records.

#### Scenario: default invocation emits Mermaid

- **WHEN** `adrkit graph` runs inside a repository with at least one
  accepted decision
- **THEN** the output starts with `flowchart` and contains one node per
  decision, labeled with its number and title

#### Scenario: node click target

- **WHEN** the Mermaid output contains a node for decision `N`
- **THEN** a `click` statement points at the record's path under
  `adr/decisions/`

#### Scenario: superseded styling

- **WHEN** a decision has `status: superseded`
- **THEN** the Mermaid output assigns it a styling class distinct from
  accepted decisions

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

### Requirement: mined reference edges

The graph SHALL draw dashed edges for references to other decisions mined
from record bodies (`ADR-N` and `ADR N` patterns). A record SHALL NOT get an
edge to itself. When a mined edge joins two records already connected by a
formal supersede edge, the mined edge SHALL be dropped in favor of the
formal one.

#### Scenario: prose reference becomes a dashed edge

- **WHEN** the body of decision 13 mentions `ADR-12` and 13 is not formally
  superseded by or superseding 12
- **THEN** the output contains a dashed edge from node 13 to node 12

#### Scenario: self-reference is ignored

- **WHEN** a record body mentions its own number
- **THEN** no edge from the node to itself appears in the output

#### Scenario: duplicate with formal edge is dropped

- **WHEN** record A's body mentions record B and A also carries
  `superseded-by: B`
- **THEN** exactly one edge (the solid formal one) connects A to B

### Requirement: temporal grouping

The graph SHALL group decisions into per-date containers - Mermaid
subgraphs titled with the date and count for same-date decisions; DOT
output SHALL rank same-date decisions at the same layer in a left-to-right
layout. Grouping SHALL NOT imply continuity between dates (no empty
in-between buckets).

#### Scenario: same-date decisions share a subgraph

- **WHEN** decisions 2 and 3 both carry `date: 2026-08-17`
- **THEN** the Mermaid output places their nodes in one subgraph whose
  title contains `2026-08-17`

### Requirement: output formats

`adrkit graph` SHALL support `--mermaid` (default), `--dot`, and `--json`.
DOT output SHALL be a valid Graphviz directed graph of the same nodes and
edges. JSON output SHALL expose, per decision: number, title, status, date,
file name, superseded-by, and the list of mined reference targets; and the
edge lists. Requesting two different formats in one invocation MUST fail
with an error naming the conflicting flags.

#### Scenario: conflicting format flags fail

- **WHEN** `adrkit graph --mermaid --dot` runs
- **THEN** the command exits non-zero with an error naming both flags

#### Scenario: DOT output

- **WHEN** `adrkit graph --dot` runs
- **THEN** the output is a `digraph` statement containing the same node and
  edge sets as the Mermaid output

#### Scenario: JSON output

- **WHEN** `adrkit graph --json` runs
- **THEN** the output parses as JSON with a decisions array and edge lists
  sufficient to rebuild the graph

### Requirement: formal-only mode

`adrkit graph --formal-only` SHALL emit only the formal `superseded-by`
edges, omitting all mined reference edges, in every format.

#### Scenario: mined edges suppressed

- **WHEN** `adrkit graph --formal-only --json` runs on a repository whose
  records cross-reference each other in prose
- **THEN** the reference edge list is empty and supersede edges remain

### Requirement: reads only durable decisions

`adrkit graph` SHALL build the graph from `adr/decisions/` records only;
drafts in `adr/.drafts/` MUST NOT appear. The command SHALL require an ADR
Kit repository and fail with the standard not-initialized error otherwise.
An unparseable record SHALL fail the command with that record's parse
error, consistent with `adrkit list`.

#### Scenario: drafts excluded

- **WHEN** a repository has one decision and one pending draft
- **THEN** the graph contains exactly the decision's node

#### Scenario: outside a repository

- **WHEN** `adrkit graph` runs in a directory with no ADR Kit repository
- **THEN** the command exits non-zero with the init hint
