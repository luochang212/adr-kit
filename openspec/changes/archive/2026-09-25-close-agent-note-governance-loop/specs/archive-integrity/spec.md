# Spec Delta

## Purpose

Makes the archived directory a verifiable historical snapshot rather than a status label whose contents can silently change after retirement.

## ADDED Requirements

### Requirement: Every archived decision has a content seal

An ADR Kit repository SHALL keep a committed manifest of every numbered record in `adr/archived/`, identified by its archive-relative path and the hash of its complete archived bytes. `adrkit archive` and `adrkit supersede` SHALL append a seal for the final archived file. They SHALL refuse to overwrite an existing seal or archive target.

#### Scenario: Archive adds a seal

- **WHEN** an implemented decision is archived successfully
- **THEN** its final archived file and a matching manifest entry exist together

#### Scenario: Supersession adds a seal

- **WHEN** an implemented decision is fully superseded
- **THEN** the superseded file is archived with its final metadata and a matching manifest entry

### Requirement: Validation detects archive drift

`adrkit validate` SHALL report missing, malformed, duplicate, or extra archive seals, missing archived files, and archived files whose bytes no longer match their seal. Repository-wide validation SHALL check the whole archive; single-record validation of an archived decision SHALL check its seal. Validation SHALL NOT require Git for current-tree integrity checks.

#### Scenario: Archived content is edited

- **WHEN** a sealed archived decision's body changes after archival
- **THEN** `adrkit validate` fails and names that archived path

#### Scenario: Archived file has no seal

- **WHEN** `adr/archived/` contains a numbered decision absent from the manifest
- **THEN** repository validation fails and names the unsealed file

#### Scenario: Non-Git repository is valid

- **WHEN** a repository's archive files and manifest match but the repository is not a Git checkout
- **THEN** normal `adrkit validate` can still pass

### Requirement: Base-aware validation enforces append-only history

Repository-wide `adrkit validate --base <git-ref>` SHALL compare the current archive manifest with the manifest at the supplied Git ref. Every entry sealed at the base SHALL retain its path, hash, and archived bytes; entries may only be appended. An absent base manifest means the base has no prior seals, while the current tree must still seal every archived decision. An unreadable base ref SHALL fail with an actionable error. The command SHALL NOT accept `--base` together with single-record validation.

#### Scenario: File and manifest are both rewritten

- **WHEN** an existing archived file and its manifest hash are changed together after the base ref
- **THEN** `adrkit validate --base <git-ref>` fails even though current-tree hashes agree

#### Scenario: A new archive is appended

- **WHEN** existing base entries are unchanged and a newly archived decision is appended with a matching seal
- **THEN** base-aware validation passes

#### Scenario: Git base cannot be read

- **WHEN** `--base` names a ref that cannot be resolved or inspected
- **THEN** validation fails and identifies the ref rather than silently skipping the history check
