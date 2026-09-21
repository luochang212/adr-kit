## MODIFIED Requirements

### Requirement: Annotated deliberation grammar

A `## Deliberation` node SHALL be
`- [Q: | A: ]<text>[ [status]][ (recommended)][ — <reason>]`. The optional
`Q:`/`A:` prefix marks a question or an option; `[settled]`, `[rejected]`, or
`[open]` is the node's state; `(recommended)` marks the option the agent
recommended; ` — <reason>` explains the node. A question's answer SHALL be its
`[settled]` child, and a settled child that is not marked `(recommended)` SHALL
be reported as an override of the agent's recommendation.

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

- **WHEN** a node reads the legacy `- Q: Where does the tree live? [settled] (round 2)`
- **THEN** the obsolete round marker is read and stripped, and the node's text is `Where does the tree live?`

### Requirement: Tree rendering modes

`adrkit tree <name>` SHALL render a record's `## Deliberation` appendix as a
text tree by default, as a Mermaid graph with `--mermaid`, and as a single
self-contained HTML document with `--html`. It SHALL give the root, questions,
and options distinct node shapes, color nodes by state, mark the recommended
option, mark an overridden question, and style the edge that raised a follow-up
question. `name` SHALL resolve like other commands (title, file name, or
decision number). A record with no renderable tree SHALL fail with a clear error
rather than print an empty document.

#### Scenario: default output is text

- **WHEN** `adrkit tree <name>` runs on a record with a deliberation tree
- **THEN** the output is an indented text tree of the same nodes, annotating the recommended option and any override

#### Scenario: mermaid output

- **WHEN** `adrkit tree <name> --mermaid` runs
- **THEN** the output starts with `graph TD`, uses a distinct shape for the root, questions, and options, colors each node by state, and styles the edge that raised a follow-up question

#### Scenario: html output is a single document

- **WHEN** `adrkit tree <name> --html` runs
- **THEN** the output is one HTML document containing the Mermaid source for the tree and a legend

#### Scenario: missing tree fails clearly

- **WHEN** `adrkit tree <name>` runs on a record with no `## Deliberation` list
- **THEN** the command exits non-zero with an error naming the record and the missing tree

#### Scenario: rounds render as layers

- **WHEN** a tree nests a follow-up question under the node that raised it
- **THEN** the deeper question renders downstream of that node, so the derived frontier layer is visible without storing a round

## ADDED Requirements

### Requirement: Nested dependency

Dependency between recorded questions SHALL be expressed by nesting: a follow-up
question SHALL be a child of the node whose settlement raised it, so related
questions run deeper and unrelated questions stay flat siblings. When the
question, not a single option, raised the follow-up, the follow-up SHALL be a
child of that question. The `Q:`/`A:` prefix SHALL keep a follow-up question
distinct from an option at the same depth. A record SHALL NOT store a frontier
round.

#### Scenario: a follow-up nests under the option that raised it

- **WHEN** a session settles an option and that answer raises a further question
- **THEN** the recorded question is a child of that option

#### Scenario: unrelated questions stay flat

- **WHEN** two questions are both askable without the other being settled
- **THEN** the record stores them as siblings

#### Scenario: an option-independent follow-up nests under the question

- **WHEN** settling a question raises a follow-up regardless of which option won
- **THEN** the recorded follow-up is a child of the question

## REMOVED Requirements

### Requirement: Frontier rounds

**Reason**: ADR 7 replaced the stored `(round N)` annotation with nesting, so a
frontier round is read from the tree's depth instead of written into the record.
