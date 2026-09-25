# Spec Delta

## MODIFIED Requirements

### Requirement: Decided-by field shape

A durable record SHALL carry exactly one `decided-by` front matter field
whose value is either `human` or `agent`. The field SHALL appear in the
canonical front matter order between `date` and `created`. A value outside
those two is a format error and SHALL be reported as such.

#### Scenario: implemented record carries the field

- **WHEN** a durable record with `status: implemented` is parsed
- **THEN** `decided-by` is one of `human` or `agent`

#### Scenario: field position is canonical

- **WHEN** a record is written by any lifecycle command
- **THEN** `decided-by` is emitted between `date` and `created` in the front
  matter block

#### Scenario: unknown value is rejected

- **WHEN** a record declares `decided-by: robot`, the retired 0.7.0 value
  `machine`, or any value other than `human` or `agent`
- **THEN** the record fails to load with a format error naming the
  accepted values

### Requirement: Validation requires decided-by on durable records

`adrkit validate` SHALL fail a durable record that omits `decided-by`, in
the same way it fails a record that omits `created`.

#### Scenario: implemented record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing an
  implemented record with no `decided-by` field
- **THEN** validation reports a missing `decided-by` issue for that record
  and exits non-zero

#### Scenario: superseded record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing a
  superseded record with no `decided-by` field
- **THEN** validation reports a missing `decided-by` issue for that record
  and exits non-zero

### Requirement: Decided-by is declared by the caller

The value SHALL be supplied by the caller of `adrkit record` and `adrkit
implement` through a `--decided-by` option, and SHALL NOT be inferred from the
environment, the terminal, a session marker, configuration, or record content.
Both commands SHALL refuse to write a durable record when the option is absent
or names a value other than `human` or `agent`. A command other than `record`
or `implement` SHALL reject the option rather than ignore it.

#### Scenario: record writes the declaration

- **WHEN** `adrkit record "<title>" --decided-by human` creates a decision
- **THEN** the record carries `decided-by: human`

#### Scenario: an autonomous decision is recorded as agent

- **WHEN** `adrkit record "<title>" --decided-by agent` creates a decision
- **THEN** the record carries `decided-by: agent`

#### Scenario: a missing declaration is refused

- **WHEN** `adrkit record` or `adrkit implement` runs without `--decided-by`
- **THEN** the command reports that the option is required and writes no record

#### Scenario: an invalid declaration is refused

- **WHEN** `record` or `implement` is invoked with a `--decided-by` value other
  than `human` or `agent`
- **THEN** the command fails with a message naming the two accepted values

#### Scenario: other commands reject the option

- **WHEN** a command that records no decision is invoked with `--decided-by`
- **THEN** the command reports that it does not take `--decided-by`

### Requirement: Declaration follows the lifecycle move

`adrkit record` SHALL record the declaration it was given on the record it
creates. `adrkit propose` SHALL NOT write the field and SHALL NOT accept a
declaration. `adrkit implement` SHALL record the declaration it was given on the
promoted decision. `adrkit supersede` SHALL preserve the retiring record's
existing value and SHALL NOT ask for or write a new one.

#### Scenario: record writes the declared value

- **WHEN** `adrkit record` creates a decision
- **THEN** the created record carries the declared `decided-by` value

#### Scenario: propose writes nothing

- **WHEN** `adrkit propose` creates a proposal
- **THEN** the proposal's front matter contains no `decided-by` key

#### Scenario: supersede preserves

- **WHEN** `adrkit supersede <old> --by <new>` retires an implemented decision
- **THEN** the retired record's `decided-by` value is unchanged after the
  rewrite, without a new declaration being asked for

#### Scenario: replacing decision is declared independently

- **WHEN** a replacement decision is recorded before the retirement
- **THEN** it carries the value declared for it, independent of the record it
  replaces

### Requirement: Validation never writes the field

The tooling SHALL NOT supply `raised-by` or `decided-by` on a record's behalf:
each value is a declaration only the caller can make, so `adrkit validate`
reports a missing or unknown value instead of filling one in.

#### Scenario: validate does not repair

- **WHEN** `adrkit validate` (or any other command) encounters an implemented record with no `raised-by` or `decided-by`
- **THEN** validation reports the missing field(s) and the record file is left byte-identical on disk

### Requirement: Raised-by field shape

A durable record SHALL carry exactly one `raised-by` front matter field whose
value is either `human` or `agent`. The field SHALL appear in the canonical
front matter order between `date` and `decided-by`. A value outside those two
is a format error and SHALL be reported as such.

#### Scenario: implemented record carries the field

- **WHEN** a durable record with `status: implemented` is parsed
- **THEN** `raised-by` is one of `human` or `agent`

#### Scenario: field position is canonical

- **WHEN** a record is written by any lifecycle command
- **THEN** `raised-by` is emitted between `date` and `decided-by` in the front matter block

#### Scenario: unknown value is rejected

- **WHEN** a record declares a `raised-by` value other than `human` or `agent`
- **THEN** the record fails to load with a format error naming the accepted values

### Requirement: Raised-by is declared by the caller

The `raised-by` value SHALL be supplied by the caller of `adrkit record` and
`adrkit implement` through a `--raised-by` option, and SHALL NOT be inferred from
the environment, the terminal, a session marker, configuration, or record
content. Both commands SHALL refuse to write a durable record when the option is
absent or names a value other than `human` or `agent`. A command other than
`record` or `implement` SHALL reject the option rather than ignore it.

#### Scenario: record writes the declaration

- **WHEN** `adrkit record "<title>" --raised-by agent --decided-by human` creates a decision
- **THEN** the record carries `raised-by: agent`

#### Scenario: a missing raised-by is refused

- **WHEN** `adrkit record` or `adrkit implement` runs without `--raised-by`
- **THEN** the command reports that the option is required and writes no record

#### Scenario: an invalid declaration is refused

- **WHEN** `record` or `implement` is invoked with a `--raised-by` value other than `human` or `agent`
- **THEN** the command fails with a message naming the two accepted values

#### Scenario: other commands reject the option

- **WHEN** a command that records no decision is invoked with `--raised-by`
- **THEN** the command reports that it does not take `--raised-by`

### Requirement: Validation requires raised-by on durable records

`adrkit validate` SHALL fail a durable record that omits `raised-by`, in the
same way it fails a record that omits `decided-by` or `created`.

#### Scenario: implemented record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing an implemented record with no `raised-by` field
- **THEN** validation reports a missing `raised-by` issue for that record and exits non-zero

#### Scenario: superseded record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing a superseded record with no `raised-by` field
- **THEN** validation reports a missing `raised-by` issue for that record and exits non-zero

### Requirement: Raised-by follows the lifecycle move

`adrkit record` SHALL record the raised-by declaration it was given on the
record it creates. `adrkit propose` SHALL NOT write the field. `adrkit implement`
SHALL record the declaration it was given on the promoted decision.
`adrkit supersede` SHALL preserve the retiring record's existing `raised-by`
value and SHALL NOT ask for or write a new one.

#### Scenario: record writes the declared value

- **WHEN** `adrkit record` creates a decision
- **THEN** the created record carries the declared `raised-by` value

#### Scenario: propose writes nothing

- **WHEN** `adrkit propose` creates a proposal
- **THEN** the proposal's front matter contains no `raised-by` key

#### Scenario: supersede preserves

- **WHEN** `adrkit supersede <old> --by <new>` retires an implemented decision
- **THEN** the retired record's `raised-by` value is unchanged after the rewrite


## ADDED Requirements

### Requirement: Proposals carry no decided-by

A proposal with `status: proposed` SHALL NOT carry `raised-by` or `decided-by`,
because a proposal has not taken effect and has no decision to attribute.
`adrkit implement` SHALL report either field as an error and refuse promotion,
and promotion SHALL NOT carry a proposal-supplied value into a decision.
`adrkit validate` covers all four lifecycle directories and SHALL report a
proposal that carries either field as an error.

#### Scenario: the validate command reports a proposal's field

- **WHEN** `adrkit validate` runs in a repository whose proposed record declares `decided-by` or `raised-by`
- **THEN** validation reports the field as an error for that record and exits non-zero

#### Scenario: promotion rejects a proposal-supplied value

- **WHEN** a proposal that declares `decided-by: human` or `raised-by: human` is submitted to `adrkit implement`
- **THEN** the command reports that the field must not appear on a proposal, leaves the proposal unchanged, and writes no decision

#### Scenario: promotion records the declaration after the proposal is corrected

- **WHEN** the caller removes the invalid field from an otherwise valid proposal and runs `adrkit implement` with `--raised-by human --decided-by agent`
- **THEN** the promoted decision records `raised-by: human` and `decided-by: agent`

## REMOVED Requirements

### Requirement: Proposed drafts carry no decided-by

**Reason**: The heading and its scenarios named the removed draft/`accept` model and the retired `adrkit validate` behavior that ignored proposals; validation now covers all four lifecycle directories.

**Migration**: Replaced by `Proposals carry no decided-by` above, which preserves the contract — proposals carry no provenance fields, and only entry to `implemented/` records them — in the four-folder lifecycle.
