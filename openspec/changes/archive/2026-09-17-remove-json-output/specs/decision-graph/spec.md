## REMOVED Requirements

### Requirement: output formats

**Reason**: `--json` output is removed from every command, and this
requirement's JSON-shape clause described that mode alone. A MODIFIED block
cannot drop a scenario, so the contract is removed and its remaining formats
are re-added under a name that matches what still exists.

**Migration**: Use `--dot` for Graphviz consumers, `--text` for a terminal
tree, or the default `--mermaid`. Nodes, edges, date grouping, and
`--formal-only` behavior are unchanged.

## ADDED Requirements

### Requirement: graph output formats

`adrkit graph` SHALL support `--mermaid` (default), `--dot`, and `--text`.
DOT output SHALL be a valid Graphviz directed graph of the same nodes and
edges. `--text` output SHALL print a terminal-readable tree of the same
graph. Requesting two different formats in one invocation MUST fail with an
error naming the conflicting flags.

#### Scenario: conflicting format flags fail

- **WHEN** `adrkit graph --mermaid --dot` runs
- **THEN** the command exits non-zero with an error naming both flags

#### Scenario: DOT output

- **WHEN** `adrkit graph --dot` runs
- **THEN** the output is a `digraph` statement containing the same node and
  edge sets as the Mermaid output

#### Scenario: text output

- **WHEN** `adrkit graph --text` runs
- **THEN** the output is a tree naming the same decisions as the Mermaid
  output

## MODIFIED Requirements

### Requirement: formal-only mode

`adrkit graph --formal-only` SHALL emit only the formal `superseded-by`
edges, omitting all mined reference edges, in every format.

#### Scenario: mined edges suppressed

- **WHEN** `adrkit graph --formal-only --dot` runs on a repository whose
  records cross-reference each other in prose
- **THEN** the output contains the supersede edge and none of the mined
  reference edges
