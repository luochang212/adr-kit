# record-lifecycle Specification

## Purpose

Keeps lifecycle moves honest: a move rewrites only the fields it owns, refuses a target that is not an active implemented decision, and never discards written content without notice.

## Requirements

### Requirement: Lifecycle rewrites preserve fields they do not own

A lifecycle rewrite performed by `adrkit implement`, `adrkit reject`, `adrkit archive`, or `adrkit supersede` SHALL NOT silently discard a front-matter field it does not own. Every canonical field the move does not set SHALL be carried through unchanged, and a non-canonical key SHALL be reported to the caller rather than dropped without notice.

#### Scenario: canonical fields, including tags, survive

- **WHEN** `adrkit supersede` rewrites an implemented record
- **THEN** its `raised-by`, `decided-by`, `created`, `commit`, and `tags` values remain unchanged except for fields the move explicitly stamps

#### Scenario: a non-canonical key is not dropped silently

- **WHEN** a lifecycle command rewrites a record carrying a front-matter key outside the canonical set
- **THEN** the command refuses the move and names the key instead of discarding it

### Requirement: Lifecycle folders distinguish unshipped, shipped, declined, and retired records

ADR Kit SHALL use `proposed/` for unshipped proposals, `implemented/` for shipped active decisions, `rejected/` for formally declined proposals, and `archived/` for retired numbered decisions. The folders SHALL be defined by context value as well as lifecycle: `implemented/` is current authority to read in full; `proposed/` is intent to check; `rejected/` is anti-pattern memory to check; `archived/` is lowest-value frozen history that is not read by default. A rejected proposal SHALL be retained as a durable terminal record and SHALL NOT be removed for appearing stale; its reason SHALL name the tempting mistake it blocks. A rejection MAY be removed only when another record owns that warning, and the removing change SHALL preserve any unique rationale first; rejections are unnumbered and unsealed, so removing a redundant one cannot reuse a number or break the archive. Only entry to `implemented/` SHALL assign a stable number. Moving an implemented decision to `archived/` SHALL also add the content seal required by `archive-integrity`.

#### Scenario: Settled but unshipped choice remains proposed

- **WHEN** a grilling session settles a direction before its implementation ships
- **THEN** the record remains unnumbered in `proposed/`

#### Scenario: Implemented decision is retired

- **WHEN** an active numbered decision is archived or fully superseded
- **THEN** it moves to `archived/` with its number preserved and a matching content seal

#### Scenario: A redundant anti-pattern is consolidated

- **WHEN** another record owns the warning a rejected proposal blocks
- **THEN** the rejection may be removed after its unique rationale is preserved, without affecting any ADR number or the archive seal

### Requirement: Supersede target is an implemented decision

`adrkit supersede <old> --by <new>` SHALL require both records to be numbered, active implemented decisions. A proposed, rejected, archived, or already-superseded record SHALL be refused as the replacement.

#### Scenario: an implemented replacement is allowed

- **WHEN** `--by` resolves to an active implemented decision distinct from the old decision
- **THEN** the old decision moves to archived history and names the replacement

#### Scenario: a superseded replacement is refused

- **WHEN** `--by` resolves to an archived decision
- **THEN** the command refuses it and reports that the replacement must be active and implemented

#### Scenario: a proposed record is refused

- **WHEN** `--by` resolves to an unnumbered proposed record
- **THEN** the command refuses it and reports that the replacement must be an implemented decision
