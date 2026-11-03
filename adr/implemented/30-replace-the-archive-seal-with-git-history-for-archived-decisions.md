---
status: implemented
date: 2026-10-22
description: "Read when retiring decisions, migrating archived formats, or deciding what Git history already guarantees."
raised-by: human
decided-by: human
created: 2026-10-22
paths:
  - adr/archived/**
  - src/core/validate.ts
  - src/core/retire.ts
  - src/core/repository.ts
  - src/core/files.ts
  - src/core/adr.ts
  - src/core/markers.ts
  - src/core/git.ts
  - src/core/cli-options.ts
  - src/cli.ts
  - src/commands/archive.ts
  - src/commands/supersede.ts
  - src/commands/validate.ts
  - src/commands/list.ts
  - src/commands/show.ts
  - src/commands/completion.ts
  - src/core/tool-integrations.ts
  - .github/workflows/ci.yml
  - test/commands.test.ts
  - test/lifecycle.test.ts
  - test/validate.test.ts
  - test/markers.test.ts
  - test/review-regressions.test.ts
  - docs/cli.md
  - docs/zh/cli.md
  - docs/record-format.md
  - docs/zh/record-format.md
  - docs/workflow.md
  - docs/zh/workflow.md
  - README.md
  - README.zh.md
  - AGENTS.md
  - skills/adrkit-init/SKILL.md
  - skills/adrkit-archive/SKILL.md
  - skills/adrkit-supersede/SKILL.md
  - skills/adrkit-validate/SKILL.md
  - skills/adrkit-review/SKILL.md
  - skills/adrkit-reject/SKILL.md
  - site/public/llms.txt
---

# ADR: 30 Replace the archive seal with Git history for archived decisions

## Problem

ADR 19 sealed every archived file in `adr/archived/MANIFEST.json`: a committed
hash of the complete bytes, checked on every validation. The seal duplicated
Git's append-only history without making it tamper-proof — the manifest
travels in the same repository, so an edit can update file and hash together,
and only Git or remote controls can detect a coordinated rewrite.

The seal also produced unfixable failures. Once the record format changed, a
sealed file could not be migrated without breaking the seal, so ADR 27 had to
exempt archived records from the current format and reference rules. Archives
became second-class data: `list`, `show`, and the lifecycle commands needed a
separate archive-tolerant identity inventory, while `graph` and `tree` could
not read a legacy archive at all. The fix cost more than the integrity it
bought, especially since Git already records every change and an agent can
migrate a record in one commit.

## Decision

Archived records are ordinary Git-tracked history. The manifest, seal module,
its commands, validation, and transaction are removed; `adrkit init` writes no
manifest, and this repository's `adr/archived/MANIFEST.json` is deleted.

- `adrkit archive` and `adrkit supersede` stamp the move, write the archived
  file, and remove the implemented source. If source removal fails, they roll
  back the staged archived file and report both paths; there is no seal write
  to half-complete.
- `adrkit validate` checks archived records exactly like the rest of the
  inventory: format, paths, references, duplicate numbers, and citations. The
  archive is no longer exempt from current rules.
- `adrkit validate --base <git-ref>` is removed. Git history is the audit for
  archived changes; a format migration is a normal commit with a stated
  reason, not a reseal transaction. The archive-tolerant identity inventory
  goes with the seal, so `list`, `show`, `graph`, `tree`, and the lifecycle
  commands read the current format and a legacy record must be migrated first
  (ADR 28).
- The four-folder lifecycle and reading policy are unchanged: `archived/` is
  still lowest-value frozen history, not current authority, and not read by
  default. "Frozen" is a social and Git-history contract, not a cryptographic
  one.
- The format-drift remedy remains: upgrade the package, migrate records where
  mechanical, report records that cannot be carried over, and re-run
  `adrkit validate --all`; there is no automatic migration command.
- This record supersedes ADRs 19 and 27. ADR 20's folder contract remains in
  force; only its seal sentence is historical.

## Alternatives considered

- **Keep the seal and allow deliberate re-sealing**: rejected. It preserves a
  second source of truth and needs a reason field, a new command, and a base
  comparison — exactly the complexity this change removes. Git already records
  the reason.
- **Seal a canonical semantic digest instead of bytes**: rejected. It needs a
  canonicalization contract for every format change and can silently accept
  changes outside the canonicalized fields.
- **Keep `validate --base` without the manifest**: rejected. It would forbid
  every archived migration or require a manifest-like history policy; Git
  already provides the diff.

## Consequences

### Verification

- `adrkit init` creates no `MANIFEST.json`; `archive` and `supersede` move
  records without reading or writing a manifest.
- Archive staging uses exclusive creation in `writeRecord`, so a competing move
  cannot overwrite a staged or completed archive; `test/review-regressions`
  covers rollback and retry after a source-removal failure.
- `validate` checks an archived record's format, paths, and references like any
  other record; `validate --base` no longer exists.
- `list`, `show`, `graph`, and `tree` use the normal parsed inventory; a legacy
  format is a migration failure, not a sealed identity.
- `npm test`, typecheck, build, `adrkit validate --all`, and the site build
  pass.

### Trade-offs

- **Breaking removal.** Existing repositories carry a now-ignored
  `MANIFEST.json`; removing it is a user-visible migration stated in the
  upgrade guide and changeset.
- **No cryptographic archive boundary.** Force-pushes and coordinated edits are
  outside the tool's control; reflogs, branch protection, and review are the
  real controls.
- **Archived migrations edit history.** A format migration may change archived
  bytes in a normal commit; reviewers treat it like any deliberate change.
- **Simpler commands and data.** The seal transaction, manifest parsing,
  identity inventory, and special validation paths are gone.

### Later changes

**Amended by ADR 43:** the manifest-removal migration note now lives in
`docs/upgrading.md` and the READMEs' Stability note; the README upgrade
section this trade-off named is gone. The duty to state the migration where
users meet it is unchanged.
