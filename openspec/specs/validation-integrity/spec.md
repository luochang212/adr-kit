# validation-integrity Specification

## Purpose
Guarantees the validator the existing specs lean on: what counts as a
section's written content, that a crafted record cannot make validation
unbounded, and that a path read as a record resolves to a regular file.

## Requirements

### Requirement: Written content excludes comments

A required section SHALL count as written only when it contains text outside
HTML comments. A section whose text is entirely inside comments — closed or
unterminated — SHALL NOT satisfy a `must contain written content` check, and an
unterminated `<!--` SHALL swallow the remainder of that section, matching
CommonMark's comment semantics for the section's extent. The rule is the same
for drafts and durable records, and for `## Alternatives considered`'s "at least
one written alternative".

#### Scenario: markers alone are not content

- **WHEN** a required section's body is a single unterminated `<!--`
- **THEN** validation reports that the section must contain written content

#### Scenario: text outside a comment is content

- **WHEN** a required section's body is `Considered SQLite, chose Postgres` with an unterminated `<!--` on the following line
- **THEN** the section counts as written and validation reports no content issue for it

#### Scenario: an unterminated comment swallows the rest of the section

- **WHEN** a required section's body is `<!--` followed by prose lines
- **THEN** the prose is inside the comment, the section counts as unwritten, and validation reports the missing content

#### Scenario: a closed comment is still stripped

- **WHEN** a required section's body is only `<!-- none written yet -->`
- **THEN** validation reports that the section must contain written content

### Requirement: Validation work is bounded on crafted input

Reading and validating a record SHALL complete in work bounded by the file's
size; the time SHALL NOT grow quadratically with it. A section body that
repeats an unterminated comment marker SHALL NOT make a command hang or
exhaust memory.

#### Scenario: a crafted marker payload is reported, not hung on

- **WHEN** a record's required section body is several hundred kilobytes of repeated `<!--` with no closing marker
- **THEN** `adrkit validate` reports the section as missing written content and returns promptly

#### Scenario: the commands that validate stay usable

- **WHEN** such a record exists in `adr/decisions/`
- **THEN** `adrkit status` and `adrkit instructions` report the validation issue instead of hanging

### Requirement: A record path resolves to a regular file

A path read as a record SHALL resolve to a regular file. When it resolves to
anything else — a directory, FIFO, socket, character device, or block device —
the reader SHALL report the kind it found and SHALL NOT read it. A symbolic
link to a regular file SHALL remain a readable record.

#### Scenario: a FIFO is reported, not read

- **WHEN** `adr/decisions/` contains a FIFO named `1-x.md`
- **THEN** `adrkit list` fails naming the path and the kind, and does not block

#### Scenario: a directory is reported, not read

- **WHEN** `adr/decisions/` contains a directory named `1-x.md`
- **THEN** the reader reports it as a directory instead of reading it

#### Scenario: a symbolic link to a regular file is a record

- **WHEN** a record path is a symbolic link whose target is a regular file with valid front matter
- **THEN** the record is read and validated like any other

#### Scenario: a link to a device is refused

- **WHEN** a record path resolves to a character device such as `/dev/zero`
- **THEN** the reader reports the kind and returns instead of reading the device
