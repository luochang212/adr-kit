# Scope retrieval delta

## Purpose

Retrieves current decision context for planned paths or actual Git changes, while exposing incomplete input acquisition and the limits of optional path scopes.

## ADDED Requirements

### Requirement: Scope matches preserve lifecycle authority

Retrieval SHALL match the existing paths glob dialect, group implemented/proposed/rejected records by reading posture, show each matching pattern, and exclude archived records from reading. Records without scopes SHALL NOT match.

#### Scenario: Scoped rejections remain visible
- **WHEN** a file matches both an implemented decision and a rejection
- **THEN** both appear with distinct authority and anti-pattern reading postures

#### Scenario: Archived parse errors do not govern retrieval
- **WHEN** an archived record is malformed but active records are readable
- **THEN** active retrieval succeeds without reading the archived file

### Requirement: Retrieval accepts one explicit input source

`relevant` SHALL accept explicit paths, `--base <git-ref>`, or `--staged`, exclusively. Base mode SHALL compare the supplied commit directly with the working tree and include non-ignored untracked files. Staged mode SHALL use the index only and work before the first commit. Git paths SHALL be normalized to the ADR repository root and treated as literal files.

#### Scenario: Conflicting input is refused
- **WHEN** flags are combined or Git input is combined with explicit paths
- **THEN** retrieval exits non-zero and explains the conflict

#### Scenario: Working changes include untracked files
- **WHEN** tracked files differ from the base and new non-ignored files exist
- **THEN** base mode retrieves decisions for both sets

#### Scenario: Staged changes exclude other work
- **WHEN** staged, unstaged-only, and untracked-only paths differ
- **THEN** staged mode retrieves only decisions for staged paths

#### Scenario: Deletion and rename preserve origin context
- **WHEN** a scoped file is deleted or renamed across scopes
- **THEN** its old path participates and a rename also includes its new path

#### Scenario: Nested root and unusual filenames
- **WHEN** an ADR repository is nested in Git and names contain spaces, newlines, or option-like prefixes
- **THEN** paths inside the ADR root match literally and sibling-project paths do not participate

#### Scenario: Empty Git input
- **WHEN** no changes exist
- **THEN** retrieval reports no changed paths without implying no architectural constraints

#### Scenario: Invalid Git input
- **WHEN** the base is invalid or Git is unavailable
- **THEN** retrieval exits non-zero with a named error rather than an empty match set

### Requirement: Incomplete filesystem searches are explicit

Directory retrieval SHALL retain the existing bounded search and exclusions, return acquired matches plus diagnostics when truncated or unreadable, and exit non-zero. Missing explicit paths SHALL remain valid planned-file queries. Active record parse/read errors SHALL be fatal rather than silently skipped.

#### Scenario: Directory budget is exceeded
- **WHEN** a directory contains more files than the retrieval budget
- **THEN** output identifies the incomplete search, retains acquired matches, recommends narrower paths, and exits non-zero

#### Scenario: Filesystem acquisition fails
- **WHEN** inspecting a path fails for a reason other than nonexistence or reading a directory fails
- **THEN** retrieval names the path and error, returns any acquired matches, and exits non-zero

#### Scenario: Malformed active corpus
- **WHEN** an active record cannot be parsed
- **THEN** retrieval names the record and exits non-zero without presenting a complete corpus

### Requirement: Scope coverage limitations accompany matches

Retrieval SHALL report the count of active records lacking scopes when nonzero and direct callers to inventory reading. Zero matches and empty diffs SHALL NOT be represented as proof that no decisions apply. Coverage gaps alone SHALL NOT cause failure.

#### Scenario: Matching records coexist with unscoped authority
- **WHEN** a query matches a scoped record and other active records have no paths
- **THEN** output retains the match, reports the unscoped count, and directs the caller to `adrkit list`
