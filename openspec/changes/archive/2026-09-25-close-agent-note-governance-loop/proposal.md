# Proposal

## Why

ADR 18 gave ADR Kit DeepSeek Harness's four lifecycle directories, but the agent workflows do not yet require a scoped supersession check when creating a record, a shipped-facts check during delivery and review, or a mechanically verifiable frozen archive. As a result, the directory names make stronger governance promises than the installed skills and `adrkit validate` can currently sustain.

## What Changes

- Make the record-creation workflows compare a new proposal or direct record with active records about the same choice or mechanism, explicitly distinguish full from partial supersession, and resolve a known full replacement in the same change rather than leaving duplicate active authority.
- Make implementation and a focused ADR-review workflow compare an implemented record with shipped code and tests, update changed realization facts in still-active records, and keep decision reversals in new, linked records rather than rewriting old rationale.
- Seal archived records with a committed content manifest, verify archive integrity through `adrkit validate`, and check append-only history against a supplied Git base in CI. Archive and supersede become the only supported ways to add sealed records; archived bodies remain historical snapshots.
- Bring the `record-lifecycle` specification up to the shipped four-directory contract as part of the delta; its current `accept`/`accepted`/`decisions/` language predates ADR 18.

## Capabilities

### New Capabilities

- `decision-governance`: Agent workflow obligations for scoped supersession review and correspondence between records and shipped behavior.
- `archive-integrity`: A verifiable, append-only seal for numbered archived records.

### Modified Capabilities

- `record-lifecycle`: Replace obsolete accepted/decisions wording with the implemented/proposed/rejected/archived contract and specify the archive/supersede transition into sealed history.

## Impact

- Changes the installed ADR Kit skills, standing-orders template, integration mirror, and their tests; adds a focused review skill without turning ADR Kit into a general code-review tool.
- Changes `adrkit init`, `archive`, `supersede`, and `validate` plus CLI completion, repository/core tests, and this repository's CI to create and verify the archive manifest.
- Updates English and Chinese documentation and dogfoods the new archive seal on existing archived ADRs. Uses Node built-ins and Git; no new runtime dependency or lifecycle directory.
- Preserves ADR 18's deliberate differences from DSH: stable numbered records, every formal rejection retained, no class folders, and no compatibility or migration layer.
