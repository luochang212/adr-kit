## ADDED Requirements

### Requirement: Provenance is two orthogonal axes

A durable record SHALL carry exactly one `raised-by` field and exactly one
`decided-by` field. `raised-by` states who put the decision on the table;
`decided-by` states whose judgment settled it. The axes are independent: a
person may raise what the agent settles, and the agent may raise what a person
settles, so any combination of the two values is valid.

#### Scenario: a record may carry opposite axes

- **WHEN** a durable record declares `raised-by: agent` and `decided-by: human`
- **THEN** the record is valid, because the two fields answer different questions

### Requirement: Raised-by field shape

A durable record SHALL carry exactly one `raised-by` front matter field whose
value is either `human` or `agent`. The field SHALL appear in the canonical
front matter order between `date` and `decided-by`. A value outside those two
is a format error and SHALL be reported as such.

#### Scenario: accepted record carries the field

- **WHEN** a durable record with `status: accepted` is parsed
- **THEN** `raised-by` is one of `human` or `agent`

#### Scenario: field position is canonical

- **WHEN** a record is written by any lifecycle command
- **THEN** `raised-by` is emitted between `date` and `decided-by` in the front matter block

#### Scenario: unknown value is rejected

- **WHEN** a record declares a `raised-by` value other than `human` or `agent`
- **THEN** the record fails to load with a format error naming the accepted values

### Requirement: Raised-by is declared by the caller

The `raised-by` value SHALL be supplied by the caller of `adrkit decide` and
`adrkit accept` through a `--raised-by` option, and SHALL NOT be inferred from
the environment, the terminal, a session marker, configuration, or record
content. Both commands SHALL refuse to write a durable record when the option is
absent or names a value other than `human` or `agent`. A command other than
`decide` or `accept` SHALL reject the option rather than ignore it.

#### Scenario: decide records the declaration

- **WHEN** `adrkit decide "<title>" --raised-by agent --decided-by human` creates a decision
- **THEN** the record carries `raised-by: agent`

#### Scenario: a missing raised-by is refused

- **WHEN** `adrkit decide` or `adrkit accept` runs without `--raised-by`
- **THEN** the command reports that the option is required and writes no record

#### Scenario: an invalid declaration is refused

- **WHEN** `decide` or `accept` is invoked with a `--raised-by` value other than `human` or `agent`
- **THEN** the command fails with a message naming the two accepted values

#### Scenario: other commands reject the option

- **WHEN** a command that records no decision is invoked with `--raised-by`
- **THEN** the command reports that it does not take `--raised-by`

### Requirement: Validation requires raised-by on durable records

`adrkit validate` SHALL fail a durable record that omits `raised-by`, in the
same way it fails a record that omits `decided-by` or `created`.

#### Scenario: accepted record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing an accepted record with no `raised-by` field
- **THEN** validation reports a missing `raised-by` issue for that record and exits non-zero

#### Scenario: superseded record without the field fails

- **WHEN** `adrkit validate` runs against a repository containing a superseded record with no `raised-by` field
- **THEN** validation reports a missing `raised-by` issue for that record and exits non-zero

### Requirement: Raised-by follows the lifecycle move

`adrkit decide` SHALL record the raised-by declaration it was given on the
record it creates. `adrkit propose` SHALL NOT write the field. `adrkit accept`
SHALL record the declaration it was given on the promoted decision.
`adrkit supersede` SHALL preserve the retiring record's existing `raised-by`
value and SHALL NOT ask for or write a new one.

#### Scenario: decide records

- **WHEN** `adrkit decide` creates a decision
- **THEN** the created record carries the declared `raised-by` value

#### Scenario: propose writes nothing

- **WHEN** `adrkit propose` creates a draft
- **THEN** the draft's front matter contains no `raised-by` key

#### Scenario: supersede preserves

- **WHEN** `adrkit supersede <old> --by <new>` retires an accepted decision
- **THEN** the retired record's `raised-by` value is unchanged after the rewrite

## MODIFIED Requirements

### Requirement: Proposed drafts carry no decided-by

A draft with `status: proposed` SHALL NOT carry `raised-by` or `decided-by`,
because a draft has not taken effect and has no decision to attribute. `accept`
SHALL report either field as an error and refuse promotion, and promotion SHALL
NOT carry a draft-supplied value into a decision. The `validate` command covers
durable records only: drafts are ephemeral and outside its surface, so the gate
that reports this error is `accept`.

#### Scenario: the validate command leaves drafts to accept

- **WHEN** `adrkit validate` runs in a repository whose draft declares `decided-by` or `raised-by`
- **THEN** the draft is not read by validation and the run is unaffected by it; the draft is gated by `accept`, not by `validate`

#### Scenario: promotion rejects a draft-supplied value

- **WHEN** a draft that declares `decided-by: human` or `raised-by: human` is submitted to `accept`
- **THEN** the command reports that the field must not appear on a draft, leaves the draft unchanged, and writes no decision

#### Scenario: promotion records the declaration after the draft is corrected

- **WHEN** the caller removes the invalid field from an otherwise valid draft and runs `accept` with `--raised-by human --decided-by agent`
- **THEN** the promoted decision records `raised-by: human` and `decided-by: agent`

### Requirement: Validation never writes the field

The tooling SHALL NOT supply `raised-by` or `decided-by` on a record's behalf:
each value is a declaration only the caller can make, so `adrkit validate`
reports a missing or unknown value instead of filling one in.

#### Scenario: validate does not repair

- **WHEN** `adrkit validate` (or any other command) encounters an accepted record with no `raised-by` or `decided-by`
- **THEN** validation reports the missing field(s) and the record file is left byte-identical on disk

### Requirement: The claim and its limits are documented

The record-format reference SHALL state, in one place, that `raised-by` and
`decided-by` are declarations by the writer rather than observations, that the
CLI neither infers nor verifies them, that they are weaker evidence than the
observed `date` and `commit` fields, and that they are defeated by a careless
or false declaration as well as by editing the file afterwards. It SHALL define
`decided-by` by where the choice came from and `raised-by` as who put the
decision on the table, and state that the two axes are independent. It SHALL
state that each field carries exactly one value and is never co-signed, and that
details about who redirected or approved belong in the record body. It SHALL
also state that the fields do not establish who chose or authorized the
decision. Identity SHALL remain git's responsibility and SHALL NOT be
duplicated into the record.

#### Scenario: reference states the trust boundary

- **WHEN** a reader consults the record-format reference for `raised-by` or `decided-by`
- **THEN** the same section explains that the values are declared, names them weaker than `date` and `commit`, and says the CLI does not verify them

#### Scenario: reference defines the two values by where the choice came from

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that `human` means a person determined the direction, including a proposal they changed into what shipped and a choice they made earlier that is recorded later, and that `agent` means the direction came from the agent's own judgment

#### Scenario: reference defines raised-by as the other axis

- **WHEN** a reader consults the record-format reference for `raised-by`
- **THEN** the same section states that `raised-by` is who put the decision on the table, that it is independent of `decided-by`, and that any combination is valid

#### Scenario: reference rules out a co-signed value

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that the field carries one value, is never co-signed, and that a person passively letting an agent's choice through keeps the record `agent` with the approval described in the body

#### Scenario: reference denies an authorization claim

- **WHEN** a reader consults the record-format reference for `decided-by`
- **THEN** the same section states that the field does not establish who chose or authorized the decision

#### Scenario: identity is not recorded

- **WHEN** a decision is recorded
- **THEN** no author name, email, or account identifier is written to the record by this capability
