# Spec Delta

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Supersede target is an accepted decision

**Reason**: The heading and its first scenario still named the retired `accepted` status even though the shipped contract already required implemented decisions.

**Migration**: Replaced by `Supersede target is an implemented decision` above with identical behavior.
