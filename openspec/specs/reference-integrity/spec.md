# reference-integrity Specification

## Purpose
Keeps the cross-references a record makes to other decisions honest: every
decision number a body names resolves to a decision that exists, so a reader or
agent following a reference never lands on nothing.

## Requirements

### Requirement: Body references must resolve

`adrkit validate` SHALL report a record whose body references a decision
number that does not exist. The reference vocabulary SHALL be the same one
`adrkit graph` mines (`ADR-N` and `ADR N`). A record's own title number
SHALL NOT be treated as a reference.

#### Scenario: a dangling reference fails validation

- **WHEN** a record body names `ADR-99` and no decision 99 exists
- **THEN** validation reports a dangling-reference issue for that record and exits non-zero

#### Scenario: a resolving reference passes

- **WHEN** a record body names `ADR-1` and decision 1 exists
- **THEN** validation reports no reference issue for that record

#### Scenario: the title number is not a reference

- **WHEN** decision 1 is validated
- **THEN** its own `# ADR: 1 <title>` heading does not produce a dangling-reference issue

#### Scenario: a single-record validation sees the whole set

- **WHEN** `adrkit validate <name>` validates one record whose body references another existing decision
- **THEN** the reference is resolved against the whole repository, not only the validated record
