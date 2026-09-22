# integration-freshness Specification

## Purpose

Tracks which adr-kit wrote a repository's installed agent integrations, so a CLI that differs from the installed skills explains the mismatch instead of failing later with an unrelated error.

## Requirements

### Requirement: Installed-with stamp

`adrkit init` and `adrkit update` SHALL record the version that wrote the agent integrations as an `installed-with` scalar in `adr/config.yaml`, written through the same in-place rewrite used for `tools` and `workflows` so user comments and unknown keys survive. A repository configured before the stamp existed SHALL remain valid and quiet.

#### Scenario: init stamps the writing version

- **WHEN** `adrkit init` creates a repository
- **THEN** `adr/config.yaml` carries `installed-with` equal to the running CLI version

#### Scenario: update re-stamps

- **WHEN** `adrkit update` rewrites the integrations
- **THEN** `installed-with` names the version that ran update

#### Scenario: an unstamped repository stays valid

- **WHEN** a repository has no `installed-with` key
- **THEN** it validates and commands emit no drift notice

### Requirement: Drift notice

`adrkit list` and `adrkit instructions` SHALL compare the stamp against the running CLI and append a one-line note when the installed integrations were written by a different version: a newer CLI SHALL suggest `adrkit update` to refresh the skills, and an older running CLI SHALL say to upgrade adr-kit to at least the version that wrote the integrations. `adrkit config` SHALL report the stamp. `adrkit validate` SHALL NOT print the notice.

#### Scenario: a newer CLI suggests update

- **WHEN** the stamp names an older version than the running CLI
- **THEN** `list` and `instructions` append a note that names `adrkit update`

#### Scenario: an older running CLI names the mismatch and the upgrade

- **WHEN** the stamp names a newer version than the running CLI
- **THEN** the note says the repository was configured by the newer version, that this CLI is older, and to upgrade adr-kit to at least that version

#### Scenario: equal versions stay quiet

- **WHEN** the stamp equals the running version
- **THEN** no notice is appended

#### Scenario: validate stays note-free

- **WHEN** `adrkit validate` runs against a repository whose stamp differs
- **THEN** its output contains no drift notice

### Requirement: The notice stays quiet when it cannot be honest

The notice SHALL be omitted when the repository has no stamp, when the integrations are explicitly opted out (`tools: []`), or when either version cannot be parsed. Version comparison SHALL reject a value with trailing characters after the patch component, such as `1.2.3.4`, rather than reading it as `1.2.3`.

#### Scenario: no stamp is quiet

- **WHEN** the repository has no `installed-with` key
- **THEN** no notice is appended

#### Scenario: an explicit opt-out is quiet

- **WHEN** `adr/config.yaml` records `tools: []`
- **THEN** no notice is appended, even when a stamp is present

#### Scenario: unparseable and trailing-junk versions are quiet

- **WHEN** either the stamp or the running version is not a version
- **THEN** no notice is appended, including for a stamp such as `1.2.3.4` that merely starts like a version

### Requirement: Reading the notice never breaks a command

When `adr/config.yaml` is malformed, `adrkit list` and `adrkit instructions` SHALL NOT fail because of the notice lookup: they SHALL behave as if there were no stamp and leave reporting the configuration error to `adrkit validate`.

#### Scenario: a malformed config does not break list

- **WHEN** `adr/config.yaml` is not a valid mapping and `adrkit list` runs
- **THEN** the command still lists the records and exits successfully, without a notice

#### Scenario: a malformed config does not break instructions

- **WHEN** `adr/config.yaml` is not a valid mapping and `adrkit instructions` runs
- **THEN** the command still prints its next-step guidance instead of failing

#### Scenario: validate reports the configuration error

- **WHEN** `adrkit validate` runs against the same malformed configuration
- **THEN** it reports the configuration problem and exits non-zero
