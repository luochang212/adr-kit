## ADDED Requirements

### Requirement: Annotated deliberation grammar

A `## Deliberation` node SHALL be
`- [Q: | A: ]<text>[ [status]][ (recommended)][ — <reason>]`. The optional
`Q:`/`A:` prefix marks a question or an option; `[settled]`, `[rejected]`,
or `[open]` is the node's state; `(recommended)` marks the option the agent
recommended; ` — <reason>` explains the node. A question's answer SHALL be its
`[settled]` child, and a settled child that is not marked `(recommended)`
SHALL be reported as an override of the agent's recommendation.

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

## MODIFIED Requirements

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

### Requirement: Tree rendering modes

`adrkit tree <name>` SHALL render a record's `## Deliberation` appendix as a
text tree by default, as a Mermaid graph with `--mermaid`, and as a single
self-contained HTML document with `--html`. It SHALL give the root, questions,
and options distinct node shapes, color nodes by state, mark the recommended
option, and mark an overridden question. `name` SHALL resolve like other
commands (title, file name, or decision number). A record with no renderable
tree SHALL fail with a clear error rather than print an empty document.

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
