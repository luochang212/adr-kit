## Purpose

Renders the optional design tree behind a decision. A grilling session records
its design tree as a nested outline in the decision's `## Deliberation`
appendix; `adrkit tree` turns that outline into a readable text tree or a
Mermaid graph, without ever storing the renderer's format as the source.

## ADDED Requirements

### Requirement: Optional Deliberation appendix

A durable decision MAY carry a `## Deliberation` appendix, and a decision
without one SHALL remain valid. When present, the appendix SHALL store the
design tree behind the decision as a nested Markdown list. A list item MAY end
with `[settled]`, `[rejected]`, or `[open]` to mark the node's status.

#### Scenario: a decision without the appendix is valid

- **WHEN** `adrkit validate` runs on an accepted decision that has no `## Deliberation` section
- **THEN** validation passes, because the appendix is optional

#### Scenario: status markers are read from the node

- **WHEN** a `## Deliberation` item ends with `[settled]`, `[rejected]`, or `[open]`
- **THEN** the renderer reports that status with the node

### Requirement: Design tree is stored as an outline, not Mermaid

The design tree SHALL be stored as a nested Markdown outline. Mermaid SHALL be a
rendering target produced on demand and SHALL NOT be the stored form.

#### Scenario: the stored appendix is Markdown

- **WHEN** a decision records its design tree
- **THEN** the appendix is a nested Markdown list, not a Mermaid diagram

### Requirement: Tree rendering modes

`adrkit tree <name>` SHALL render a record's `## Deliberation` appendix as a
text tree by default and as a Mermaid graph with `--mermaid`. `name` SHALL
resolve like other commands (title, file name, or decision number). A record
with no renderable tree SHALL fail with a clear error rather than print an empty
document.

#### Scenario: default output is text

- **WHEN** `adrkit tree <name>` runs on a record with a deliberation tree
- **THEN** the output is an indented text tree of the same nodes

#### Scenario: mermaid output

- **WHEN** `adrkit tree <name> --mermaid` runs
- **THEN** the output starts with `graph TD` and contains one node per tree node with parent-child edges

#### Scenario: missing tree fails clearly

- **WHEN** `adrkit tree <name>` runs on a record with no `## Deliberation` list
- **THEN** the command exits non-zero with an error naming the record and the missing tree
