## Purpose

Keeps lifecycle moves honest: a move rewrites only the fields it owns, refuses a target that is not a valid accepted decision, and never discards written content without notice.

## ADDED Requirements

### Requirement: Lifecycle rewrites preserve fields they do not own

A lifecycle rewrite performed by `adrkit accept` or `adrkit supersede` SHALL NOT silently discard a front-matter field it does not own. Every canonical field the move does not set SHALL be carried through unchanged, and a non-canonical key SHALL be reported to the caller rather than dropped without notice.

#### Scenario: canonical fields, including tags, survive

- **WHEN** `adrkit supersede` rewrites a record
- **THEN** its `raised-by`, `decided-by`, `created`, `commit`, and `tags` values are unchanged except for the fields the move stamps

#### Scenario: a non-canonical key is not dropped silently

- **WHEN** `adrkit supersede` rewrites a record that carries a front-matter key outside the canonical set
- **THEN** the command surfaces the key — by refusing the move or warning in its output — instead of discarding it without notice

### Requirement: Supersede target is an accepted decision

`adrkit supersede <name> --by <by>` SHALL require `<by>` to resolve to a decision whose status is `accepted` and that is not itself superseded. A record whose status is not `accepted` SHALL be refused even when it lives in `adr/decisions/`.

#### Scenario: an accepted replacement is allowed

- **WHEN** `--by` resolves to an accepted, non-superseded decision
- **THEN** the move proceeds

#### Scenario: a superseded replacement is refused

- **WHEN** `--by` resolves to a decision that is already superseded
- **THEN** the command refuses and names the currently accepted successor path

#### Scenario: a proposed record is refused

- **WHEN** `--by` resolves to a record with `status: proposed` in `adr/decisions/`
- **THEN** the command refuses and reports that the replacement must be an accepted decision
