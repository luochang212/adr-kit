## Purpose

Records and maintains the `decided-by` front matter field, which states
whether a decision was initiated by a human or a machine, so a durable
record no longer reads the same when a person authorized it and when an
agent did. The capability stamps that field across the record lifecycle from
the environment the command ran in, and defines the limits of the claim so
the field is never presented as stronger evidence than it is.

## ADDED Requirements

### Requirement: Decided-by field shape

A durable record SHALL carry exactly one `decided-by` front matter field
whose value is either `human` or `machine`. The field SHALL appear in the
canonical front matter order between `date` and `created`. A value outside
those two is a format error and SHALL be reported as such.

#### Scenario: accepted record carries the field

- **WHEN** a durable record with `status: accepted` is parsed
- **THEN** `decided-by` is one of `human` or `machine`

#### Scenario: field position is canonical

- **WHEN** a record is written by any lifecycle command
- **THEN** `decided-by` is emitted between `date` and `created` in the front
  matter block

#### Scenario: unknown value is rejected

- **WHEN** a record declares `decided-by: robot` or any value other than
  `human` or `machine`
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

- **WHEN** a draft that declares `decided-by: human` is promoted
- **AND** the promotion runs in an environment where a machine session is
  detected
- **THEN** the promoted decision records `decided-by: machine`

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

### Requirement: Decided-by reflects the execution environment at stamp time

The value SHALL be produced by the running command from the environment it
executes in, and SHALL NOT be settable through a command-line option,
configuration setting, or record content. A run in which a known agent
session is detectable SHALL stamp `machine`; every other run SHALL stamp
`human`.

#### Scenario: human-run recording stamps human

- **WHEN** `adrkit decide` records a decision in a shell where no agent
  session is detectable
- **THEN** the record carries `decided-by: human`

#### Scenario: agent-run recording stamps machine

- **WHEN** `adrkit decide` records a decision in an environment where a
  known agent session is detectable
- **THEN** the record carries `decided-by: machine`

#### Scenario: flags cannot override the stamp

- **WHEN** any lifecycle command is invoked with an option naming an origin
  (for example `--decided-by human`)
- **THEN** the command rejects the unknown option instead of honoring it

### Requirement: Stamp follows the lifecycle move

`adrkit decide` SHALL stamp the field on the record it creates. `adrkit
propose` SHALL NOT write the field. `adrkit accept` SHALL stamp the promoted
decision from the environment at promotion time. `adrkit supersede` SHALL
preserve the retiring record's existing value and SHALL NOT re-stamp it.

#### Scenario: decide stamps

- **WHEN** `adrkit decide` creates a decision
- **THEN** the created record carries a `decided-by` value for the
  environment the command ran in

#### Scenario: propose writes nothing

- **WHEN** `adrkit propose` creates a draft
- **THEN** the draft's front matter contains no `decided-by` key

#### Scenario: supersede preserves

- **WHEN** `adrkit supersede <old> --by <new>` retires an accepted decision
- **THEN** the retired record's `decided-by` value is unchanged after the
  rewrite, even when the supersede command runs in an environment with a
  different detected origin

#### Scenario: replacing decision is stamped independently

- **WHEN** a replacement decision is recorded before the retirement
- **THEN** it carries its own `decided-by` value for the environment that
  recorded it, independent of the record it replaces

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

The record-format reference SHALL state, in one place, that `decided-by` is
an inferred environment stamp rather than an attested fact, that it is
weaker evidence than the observed `date` and `commit` fields, and which
actions defeat it (clearing or masking the detected session, invoking the
command through a wrapper, or editing the file afterwards). Identity SHALL
remain git's responsibility and SHALL NOT be duplicated into the record.

#### Scenario: reference states the trust boundary

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section explains the inference, names it weaker than
  `date` and `commit`, and lists the ways it can be defeated

#### Scenario: identity is not recorded

- **WHEN** a decision is recorded
- **THEN** no author name, email, or account identifier is written to the
  record by this capability
