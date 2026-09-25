# Spec Delta

## MODIFIED Requirements

### Requirement: Optional Deliberation appendix

A durable decision MAY carry a `## Deliberation` appendix, and a decision
without one SHALL remain valid. When present, the appendix SHALL store the
design tree behind the decision as a nested Markdown list in the annotated
deliberation grammar.

#### Scenario: a decision without the appendix is valid

- **WHEN** `adrkit validate` runs on an implemented decision that has no `## Deliberation` section
- **THEN** validation passes, because the appendix is optional

#### Scenario: status markers are read from the node

- **WHEN** a `## Deliberation` item carries `[settled]`, `[rejected]`, or `[open]`
- **THEN** the renderer reports that status with the node, even when a reason or the `(recommended)` marker follows the tag
