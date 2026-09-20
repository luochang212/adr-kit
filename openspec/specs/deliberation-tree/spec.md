# deliberation-tree Specification

## Purpose
Renders the optional design tree behind a decision. A grilling session records
its design tree as a nested outline in the decision's `## Deliberation`
appendix; `adrkit tree` turns that outline into a readable text tree or a
Mermaid graph, without ever storing the renderer's format as the source.

## Requirements

### Requirement: Optional Deliberation appendix

A durable decision MAY carry a `## Deliberation` appendix, and a decision
without one SHALL remain valid. When present, the appendix SHALL store the
design tree behind the decision as a nested Markdown list in the annotated
deliberation grammar.

#### Scenario: a decision without the appendix is valid

- **WHEN** `adrkit validate` runs on an accepted decision that has no `## Deliberation` section
- **THEN** validation passes, because the appendix is optional

#### Scenario: status markers are read from the node

- **WHEN** a `## Deliberation` item carries `[settled]`, `[rejected]`, or `[open]`
- **THEN** the renderer reports that status with the node, even when a reason or the `(recommended)` marker follows the tag

### Requirement: Design tree is stored as an outline, not Mermaid

The design tree SHALL be stored as a nested Markdown outline. Mermaid SHALL be a
rendering target produced on demand and SHALL NOT be the stored form.

#### Scenario: the stored appendix is Markdown

- **WHEN** a decision records its design tree
- **THEN** the appendix is a nested Markdown list, not a Mermaid diagram

### Requirement: Tree rendering modes

`adrkit tree <name>` SHALL render a record's `## Deliberation` appendix as a
text tree by default, as a Mermaid graph with `--mermaid`, and as a single
self-contained HTML document with `--html`. It SHALL give the root, questions,
and options distinct node shapes, color nodes by state, mark the recommended
option, mark an overridden question, and group annotated questions by frontier
round. `name` SHALL resolve like other commands (title, file name, or decision
number). A record with no renderable tree SHALL fail with a clear error rather
than print an empty document.

#### Scenario: default output is text

- **WHEN** `adrkit tree <name>` runs on a record with a deliberation tree
- **THEN** the output is an indented text tree of the same nodes, annotating the recommended option and any override

#### Scenario: mermaid output

- **WHEN** `adrkit tree <name> --mermaid` runs
- **THEN** the output starts with `graph TD`, uses a distinct shape for the root, questions, and options, and colors each node by state

#### Scenario: html output is a single document

- **WHEN** `adrkit tree <name> --html` runs
- **THEN** the output is one HTML document containing the Mermaid source for the tree

#### Scenario: missing tree fails clearly

- **WHEN** `adrkit tree <name>` runs on a record with no `## Deliberation` list
- **THEN** the command exits non-zero with an error naming the record and the missing tree

#### Scenario: rounds render as layers

- **WHEN** `adrkit tree <name> --mermaid` runs on a tree whose questions carry `(round N)`
- **THEN** the nodes of each round are grouped into a labeled subgraph, and a tree with no round annotations renders as before

### Requirement: Annotated deliberation grammar

A `## Deliberation` node SHALL be
`- [Q: | A: ]<text>[ [status]][ (round N)][ (recommended)][ — <reason>]`. The
optional `Q:`/`A:` prefix marks a question or an option; `[settled]`,
`[rejected]`, or `[open]` is the node's state; `(round N)` records the
frontier round in which the session settled the node; `(recommended)` marks the
option the agent recommended; ` — <reason>` explains the node. A question's
answer SHALL be its `[settled]` child, and a settled child that is not marked
`(recommended)` SHALL be reported as an override of the agent's
recommendation.

#### Scenario: a reason after the status is parsed

- **WHEN** a node reads `- A: A1 do not persist it [rejected] — keep only the distilled ADR`
- **THEN** the node's state is `rejected` and its reason is `keep only the distilled ADR`

#### Scenario: a question is distinguished from an option

- **WHEN** a node carries a `Q:` prefix and a child carries an `A:` prefix
- **THEN** the renderer treats the first as a question and the second as an option

#### Scenario: an override is detected

- **WHEN** a question has a `[settled]` child that is not marked `(recommended)`
- **THEN** the renderer marks the question as overridden

#### Scenario: a taken recommendation is not an override

- **WHEN** a question's `[settled]` child is marked `(recommended)`
- **THEN** the renderer marks the node as following the recommendation, not overridden

#### Scenario: a round after the status is parsed

- **WHEN** a node reads `- Q: Where does the tree live? [settled] (round 2)`
- **THEN** the node's status is `settled` and its round is `2`

### Requirement: Frontier rounds

A grilling session SHALL proceed in frontier rounds: each round asks the
questions that the preceding answers exposed, and SHALL NOT ask a question
whose answer depends on a question still open. A recorded question MAY carry
`(round N)`, numbered from 1 in the order the session asked its questions. A
round annotation SHALL be recorded as the session runs, not reconstructed after
it. Options SHALL inherit the round of their parent question. Records written
before this convention SHALL remain valid without round annotations.

#### Scenario: a round is recorded while the session runs

- **WHEN** a question is settled in the session's second frontier round
- **THEN** the recorded question carries `(round 2)` and its options carry no separate round

#### Scenario: a record without round annotations stays valid

- **WHEN** `adrkit validate` runs on a decision whose deliberation tree has no round annotations
- **THEN** validation passes, because round annotations are optional
