## ADDED Requirements

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
