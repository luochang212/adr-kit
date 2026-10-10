# archive-integrity Specification

## Purpose

Makes the archived directory a verifiable historical snapshot rather than a status label whose contents can silently change after retirement.

## Requirements

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

### Requirement: Archive manifest is required even when empty

Every ADR Kit repository SHALL carry a valid `adr/archived/MANIFEST.json` even when the archive is empty, and repository-wide validation SHALL report a missing or malformed manifest as an error rather than passing an empty archive. `adrkit init` writes the empty manifest, and `adrkit archive` and `adrkit supersede` require it.

#### Scenario: Empty archive still needs a manifest

- **WHEN** repository-wide `adrkit validate` runs in a repository whose `adr/archived/` directory has no `MANIFEST.json`
- **THEN** validation fails naming the missing manifest instead of passing the empty archive

#### Scenario: init writes the empty manifest

- **WHEN** `adrkit init` initializes a repository
- **THEN** `adr/archived/MANIFEST.json` exists with an empty entry list and validates

### Requirement: Base-aware validation enforces append-only history

Repository-wide `adrkit validate --base <git-ref>` SHALL compare the current archive manifest with the manifest at the supplied Git ref. Every entry sealed at the base SHALL retain its path, hash, and archived bytes; entries may only be appended. The command SHALL NOT accept `--base` together with single-record validation.

#### Scenario: File and manifest are both rewritten

- **WHEN** an existing archived file and its manifest hash are changed together after the base ref
- **THEN** `adrkit validate --base <git-ref>` fails even though current-tree hashes agree

#### Scenario: A new archive is appended

- **WHEN** existing base entries are unchanged and a newly archived decision is appended with a matching seal
- **THEN** base-aware validation passes

### Requirement: Base-aware validation requires readable history

The base ref SHALL carry `adr/archived/MANIFEST.json`; a missing or unreadable base manifest SHALL fail with an actionable error that identifies the ref. An unreadable base ref SHALL fail with an actionable error.

#### Scenario: Base carries no readable manifest

- **WHEN** the base ref has no manifest, or its manifest cannot be read as in a partial clone
- **THEN** `adrkit validate --base <git-ref>` fails with an error that identifies the ref instead of silently skipping the append-only check

#### Scenario: Git base cannot be read

- **WHEN** `--base` names a ref that cannot be resolved or inspected
- **THEN** validation fails and identifies the ref rather than silently skipping the history check

### Requirement: Post-seal removal failures report partial completion

If `archive` or `supersede` writes the archived record and its seal but fails to remove the implemented source, it SHALL fail with a diagnostic stating that sealing completed and source removal failed. The diagnostic SHALL identify both record paths, retain the original failure detail, and explain recovery. The sealed file and manifest entry SHALL remain unchanged; the command SHALL NOT claim success or complete rollback.

#### Scenario: Archive cannot remove its source

- **WHEN** source removal fails after `adrkit archive` writes the archived file and manifest seal
- **THEN** the command exits non-zero and reports both the completed sealing and failed source removal
- **AND** both copies remain present and the archived copy still matches its seal
- **AND** the diagnostic names both paths and retains the original error detail

#### Scenario: Supersede cannot remove its source

- **WHEN** source removal fails after `adrkit supersede` seals the superseded record
- **THEN** the command exits non-zero with the same partial-completion diagnostic
- **AND** the replacement stays active and unchanged
- **AND** the superseded archived file and its seal remain intact

### Requirement: Recovery guidance preserves sealed history

A post-seal removal diagnostic SHALL advise inspecting both copies and the sealed archive before repairing permissions and removing only the redundant implemented source. It SHALL direct the user to validate after recovery and warn that retrying by decision number is ambiguous while both copies exist. It SHALL NOT advise changing the archived bytes or seal, or deleting the source without first checking for unique content.

#### Scenario: Recover from retained duplicate records

- **WHEN** the user follows the diagnostic, confirms the source has no unique content, and removes only the retained implemented copy
- **THEN** repository validation passes for an otherwise valid repository
- **AND** the archived bytes and manifest remain unchanged

#### Scenario: Source has unique content

- **WHEN** the retained source contains content not represented in the archived copy
- **THEN** recovery guidance requires preserving that content before removing the duplicate
- **AND** it does not permit rewriting the sealed archive to incorporate it
