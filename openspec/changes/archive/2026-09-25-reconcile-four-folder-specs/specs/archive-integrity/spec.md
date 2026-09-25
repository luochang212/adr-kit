# Spec Delta

## MODIFIED Requirements

### Requirement: Validation detects archive drift

`adrkit validate` SHALL report missing, malformed, duplicate, or extra archive seals, missing archived files, and archived files whose bytes no longer match their seal. Every ADR Kit repository SHALL carry a valid `adr/archived/MANIFEST.json` even when the archive is empty, and repository-wide validation SHALL report a missing or malformed manifest as an error rather than passing an empty archive. `adrkit init` writes the empty manifest, and `adrkit archive` and `adrkit supersede` require it. Repository-wide validation SHALL check the whole archive; single-record validation of an archived decision SHALL check its seal. Validation SHALL NOT require Git for current-tree integrity checks.

#### Scenario: Archived content is edited

- **WHEN** a sealed archived decision's body changes after archival
- **THEN** `adrkit validate` fails and names that archived path

#### Scenario: Archived file has no seal

- **WHEN** `adr/archived/` contains a numbered decision absent from the manifest
- **THEN** repository validation fails and names the unsealed file

#### Scenario: Empty archive still needs a manifest

- **WHEN** repository-wide `adrkit validate` runs in a repository whose `adr/archived/` directory has no `MANIFEST.json`
- **THEN** validation fails naming the missing manifest instead of passing the empty archive

#### Scenario: init writes the empty manifest

- **WHEN** `adrkit init` initializes a repository
- **THEN** `adr/archived/MANIFEST.json` exists with an empty entry list and validates

#### Scenario: Non-Git repository is valid

- **WHEN** a repository's archive files and manifest match but the repository is not a Git checkout
- **THEN** normal `adrkit validate` can still pass

### Requirement: Base-aware validation enforces append-only history

Repository-wide `adrkit validate --base <git-ref>` SHALL compare the current archive manifest with the manifest at the supplied Git ref. Every entry sealed at the base SHALL retain its path, hash, and archived bytes; entries may only be appended. An absent manifest at the base ref means the base has no prior seals, while the current tree must still seal every archived decision. When the manifest path exists at the base ref but its content cannot be read, validation SHALL fail with an actionable error that identifies the ref rather than treating it as no prior seals. An unreadable base ref SHALL fail with an actionable error. The command SHALL NOT accept `--base` together with single-record validation.

#### Scenario: File and manifest are both rewritten

- **WHEN** an existing archived file and its manifest hash are changed together after the base ref
- **THEN** `adrkit validate --base <git-ref>` fails even though current-tree hashes agree

#### Scenario: A new archive is appended

- **WHEN** existing base entries are unchanged and a newly archived decision is appended with a matching seal
- **THEN** base-aware validation passes

#### Scenario: Base manifest exists but cannot be read

- **WHEN** the manifest path exists at the base ref but its content cannot be read, as in a partial clone
- **THEN** `adrkit validate --base <git-ref>` fails with an error that identifies the ref instead of silently skipping the append-only check

#### Scenario: Git base cannot be read

- **WHEN** `--base` names a ref that cannot be resolved or inspected
- **THEN** validation fails and identifies the ref rather than silently skipping the history check
