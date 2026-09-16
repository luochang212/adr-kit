# decision-provenance Specification

## Purpose
Records and maintains the `decided-by` front matter field, which states where a
decision came from: `human` when a person determined the direction (they stated
it, changed an agent's proposal into what shipped, or the choice is recorded
after the fact), `agent` when the direction came from the agent's own judgment.
The value is a single declaration the caller supplies at `decide` or `accept`
time, because no environment, terminal, or session marker can reveal who chose;
it is never co-signed, and nuance about who proposed or approved lives in the
body. The field does not establish who chose, authorized, or approved a
decision. The capability collects the declaration across the record lifecycle
and defines the limits of the claim so the field is never presented as stronger
evidence than it is.

## Requirements

### Requirement: Decided-by field shape

A durable record SHALL carry exactly one `decided-by` front matter field
whose value is either `human` or `agent`. The field SHALL appear in the
canonical front matter order between `date` and `created`. A value outside
those two is a format error and SHALL be reported as such.

#### Scenario: accepted record carries the field

- **WHEN** a durable record with `status: accepted` is parsed
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

### Requirement: Proposed drafts carry no decided-by

A draft with `status: proposed` SHALL NOT carry `decided-by`, because a
draft has not taken effect and has no decision to attribute. Validation of a
draft SHALL report the field as an error, and promotion SHALL NOT carry a
draft-supplied value into a decision.

#### Scenario: draft with the field is invalid

- **WHEN** a draft in `adr/.drafts/` declares `decided-by`
- **THEN** validating the draft reports an error for that field

#### Scenario: promotion discards a draft-supplied value

- **WHEN** a draft that declares `decided-by: human` is promoted with
  `--decided-by agent`
- **THEN** the promoted decision records `decided-by: agent`

### Requirement: Validation requires decided-by on durable records

`adrkit validate` SHALL fail a durable record that omits `decided-by`, in
the same way it fails a record that omits `created`.

#### Scenario: accepted record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing an
  accepted record with no `decided-by` field
- **THEN** validation reports a missing `decided-by` issue for that record
  and exits non-zero

#### Scenario: superseded record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing a
  superseded record with no `decided-by` field
- **THEN** validation reports a missing `decided-by` issue for that record
  and exits non-zero

### Requirement: Decided-by is declared by the caller

The value SHALL be supplied by the caller of `adrkit decide` and `adrkit
accept` through a `--decided-by` option, and SHALL NOT be inferred from the
environment, the terminal, a session marker, configuration, or record content.
Both commands SHALL refuse to write a durable record when the option is absent
or names a value other than `human` or `agent`. A command other than `decide`
or `accept` SHALL reject the option rather than ignore it.

#### Scenario: decide records the declaration

- **WHEN** `adrkit decide "<title>" --decided-by human` creates a decision
- **THEN** the record carries `decided-by: human`

#### Scenario: an autonomous decision is recorded as agent

- **WHEN** `adrkit decide "<title>" --decided-by agent` creates a decision
- **THEN** the record carries `decided-by: agent`

#### Scenario: a missing declaration is refused

- **WHEN** `adrkit decide` or `adrkit accept` runs without `--decided-by`
- **THEN** the command reports that the option is required and writes no record

#### Scenario: an invalid declaration is refused

- **WHEN** `decide` or `accept` is invoked with a `--decided-by` value other
  than `human` or `agent`
- **THEN** the command fails with a message naming the two accepted values

#### Scenario: other commands reject the option

- **WHEN** a command that records no decision is invoked with `--decided-by`
- **THEN** the command reports that it does not take `--decided-by`

### Requirement: Declaration follows the lifecycle move

`adrkit decide` SHALL record the declaration it was given on the record it
creates. `adrkit propose` SHALL NOT write the field and SHALL NOT accept a
declaration. `adrkit accept` SHALL record the declaration it was given on the
promoted decision. `adrkit supersede` SHALL preserve the retiring record's
existing value and SHALL NOT ask for or write a new one.

#### Scenario: decide records

- **WHEN** `adrkit decide` creates a decision
- **THEN** the created record carries the declared `decided-by` value

#### Scenario: propose writes nothing

- **WHEN** `adrkit propose` creates a draft
- **THEN** the draft's front matter contains no `decided-by` key

#### Scenario: supersede preserves

- **WHEN** `adrkit supersede <old> --by <new>` retires an accepted decision
- **THEN** the retired record's `decided-by` value is unchanged after the
  rewrite, without a new declaration being asked for

#### Scenario: replacing decision is declared independently

- **WHEN** a replacement decision is recorded before the retirement
- **THEN** it carries the value declared for it, independent of the record it
  replaces

### Requirement: Historical records are not back-filled

The tooling SHALL NOT write `decided-by` into records that already exist in
order to satisfy validation. A record created before this capability SHALL
remain unmodified by any command except the lifecycle move the user
explicitly requests, and the migration SHALL be documented in release notes.

#### Scenario: validate does not repair

- **WHEN** `adrkit validate` (or any other command) encounters an existing
  accepted record with no `decided-by`
- **THEN** the record file is left byte-identical on disk

#### Scenario: migration is documented

- **WHEN** the release containing this capability is published
- **THEN** its notes state that pre-existing accepted records fail
  validation until a value is supplied, and that the tool will not supply it

### Requirement: The claim and its limits are documented

The record-format reference SHALL state, in one place, that `decided-by` is a
declaration by the writer rather than an observation, that the CLI neither
infers nor verifies it, that it is weaker evidence than the observed `date`
and `commit` fields, and that it is defeated by a careless or false declaration
as well as by editing the file afterwards. It SHALL define what `human` and
`agent` mean by where the choice came from: `human` when a person determined
the direction (they stated it, changed an agent's proposal into what shipped,
or the choice is being recorded after the fact), `agent` when the direction
came from the agent's own judgment. It SHALL state that a person merely letting
an agent's proposal through without engaging with the choice leaves the source
with the agent, that the field carries exactly one value and is never
co-signed, and that details about who proposed, redirected, or approved belong
in the record body. It SHALL also state that the field does not establish who
chose or authorized the decision. Identity SHALL remain git's responsibility
and SHALL NOT be duplicated into the record.

#### Scenario: reference states the trust boundary

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section explains that the value is declared, names it
  weaker than `date` and `commit`, and says the CLI does not verify it

#### Scenario: reference defines the two values by where the choice came from

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that `human` means a person determined the
  direction, including a proposal they changed into what shipped and a choice
  they made earlier that is recorded later, and that `agent` means the
  direction came from the agent's own judgment

#### Scenario: reference rules out a co-signed value

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that the field carries one value, is never
  co-signed, and that a person passively letting an agent's choice through
  keeps the record `agent` with the approval described in the body

#### Scenario: reference denies an authorization claim

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that the field does not establish who chose
  or authorized the decision

#### Scenario: identity is not recorded

- **WHEN** a decision is recorded
- **THEN** no author name, email, or account identifier is written to the
  record by this capability
