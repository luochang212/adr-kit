## ADDED Requirements

### Requirement: Repository validation reports invalid configuration types

Repository-wide validation SHALL reject present configuration fields whose types violate the known schema: `context` and `installed-with` are strings; `tools` and `workflows` are lists of strings; `rules` is a mapping of string lists. Each diagnostic SHALL identify `adr/config.yaml`, the offending field or zero-based list index, and the expected type. Missing optional fields and unknown keys SHALL remain accepted.

#### Scenario: Workflow selection is a scalar

- **WHEN** `adr/config.yaml` contains `workflows: propose`
- **THEN** repository-wide validation fails and identifies `workflows` as requiring a list of strings

#### Scenario: Context has an invalid type

- **WHEN** `context` is a list rather than a string
- **THEN** repository-wide validation fails and identifies `context` and the expected string type

#### Scenario: A rule item is parsed as a mapping

- **WHEN** `rules.proposal` contains a string followed by an unquoted `max: 500` mapping
- **THEN** repository-wide validation fails and identifies `rules.proposal[1]` as requiring a string
- **AND** the diagnostic explains that quoting the whole item preserves it as a string

#### Scenario: Remaining known fields have invalid types

- **WHEN** `tools` contains a non-string item, `installed-with` is not a string, `rules` is not a mapping, or a rule group is not a string list
- **THEN** repository-wide validation reports the offending field or item and expected type

#### Scenario: Optional and extension configuration remains compatible

- **WHEN** known fields have valid types or are absent and the config contains an unknown key
- **THEN** validation reports no configuration-type issue
- **AND** rule text remains advisory rather than being checked for semantic compliance

### Requirement: Configuration diagnostics preserve tolerant task-start reads

Configuration-type diagnostics SHALL NOT change existing tolerant reads into failures. `list` SHALL continue discovering records despite invalid configuration fields, and `instructions` SHALL report configuration issues through its existing validation flow. Config mutations SHALL preserve unknown keys and unrelated comments.

#### Scenario: Records remain discoverable

- **WHEN** a repository contains records and a wrongly typed `workflows` field
- **THEN** `adrkit list` still lists its records
- **AND** `adrkit instructions` reports the configuration validation issue

#### Scenario: Integration update preserves extension data

- **WHEN** an integration update rewrites a valid configuration containing comments and unknown keys
- **THEN** those unrelated comments and keys survive
