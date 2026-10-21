---
status: implemented
date: 2026-10-22
raised-by: human
decided-by: human
created: 2026-10-22
commit: "7679402"
tags: [archive-integrity, governance, compatibility]
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
hash of the complete bytes, checked on every validation. The seal was meant to
make "frozen history" verifiable, but it duplicated Git's append-only history.
The manifest travels in the same repository, so it is not tamper-proof: an edit
can update the file and its hash together, and only Git's own history or remote
controls can detect a coordinated rewrite.

The seal also produced unfixable failures. Once the record format changed, a
sealed file could not be migrated without breaking the seal, so ADR 27 had to
exempt archived records from the current format and reference rules. That turned
archives into second-class data: `list`, `show`, and the lifecycle commands
needed a separate archive-tolerant identity inventory, while `graph` and
`tree` still could not read a legacy archive at all. The fix cost more than the
integrity it bought, especially now that Git already records every change and
an agent can migrate a record in one commit.

## Decision

Archived records are ordinary Git-tracked history. The archive manifest, the
seal module, its commands, its validation, and its transaction are removed;
`adrkit init` writes no manifest, and `adr/archived/MANIFEST.json` is deleted
from this repository.

- `adrkit archive` and `adrkit supersede` stamp the lifecycle move, write the
  archived file, and remove the implemented source. If source removal fails,
  they roll back the staged archived file and report both paths; there is no
  seal write to half-complete.
- `adrkit validate` checks archived records exactly like the rest of the
  inventory: format, paths, references, duplicate numbers, and citations. The
  archive is no longer exempt from current rules.
- `adrkit validate --base <git-ref>` is removed. Git history is the audit for
  archived changes; a format migration is a normal commit with a stated reason,
  not a reseal transaction.
- The archive-tolerant identity inventory is removed with the seal. `list`,
  `show`, `graph`, `tree`, and the lifecycle commands read the current
  format; a legacy record must be migrated before those views work (ADR 28).
- The four-folder lifecycle and the reading policy are unchanged: `archived/`
  is still lowest-value frozen history, not current authority, and not read by
  default. "Frozen" is a social and Git-history contract, not a cryptographic
  one.
- The format-drift remedy remains: an agent upgrades the package, migrates
  records where the change is mechanical, reports records it cannot carry over,
  and re-runs `adrkit validate --all`. There is no automatic migration command,
  in line with the no-forward-compatibility stance.
- This record supersedes ADRs 19 and 27. ADR 20's folder contract remains in
  force; only its seal sentence is historical.

## Alternatives considered

- **Keep the seal and allow deliberate re-sealing**: rejected. It preserves a
  second source of truth and needs a reason field, a new command, and a base
  comparison that distinguishes intentional from accidental changes — exactly
  the complexity this change removes. Git already records the reason.
- **Seal a canonical semantic digest instead of bytes**: rejected. It needs a
  canonicalization contract for every format change and can silently accept
  changes outside the canonicalized fields; the format would grow a second
  meaning.
- **Keep the manifest as an optional export/integrity file**: rejected. An
  unvalidated manifest becomes stale ceremony, and a validated one recreates the
  unfixable-archive problem.
- **Keep `validate --base` without the manifest**: rejected. It would either
  forbid every archived migration or require a manifest-like history policy.
  Git already provides the diff.
- **Keep the seal only for offline copies**: rejected for now. ADR Kit has no
  distribution format outside a Git checkout; adding one would need its own
  integrity design, not a repository manifest.

## Consequences

### Verification

- `adrkit init` creates no `MANIFEST.json`; `adrkit archive` and
  `adrkit supersede` move records without reading or writing a manifest.
- `adrkit validate` checks an archived record's format, paths, and references
  like any other record; `validate --base` no longer exists.
- `list`, `show`, `graph`, and `tree` use the normal parsed inventory; a
  legacy format is a migration failure, not a sealed identity.
- `npm test`, `npm run typecheck`, `npm run build`, `adrkit validate --all`,
  and the site build pass.
- `test/commands.test.ts`, `test/lifecycle.test.ts`, `test/validate.test.ts`,
  `test/markers.test.ts`, and `test/review-regressions.test.ts` cover the
  manifest-free archive and validation paths.

### Trade-offs

- **Breaking removal.** Existing repositories carry a `MANIFEST.json` that is
  now ignored. Removing the file is a user-visible migration, stated in the
  README upgrade section and the changeset.
- **No cryptographic archive boundary.** A force-push or a coordinated edit of
  archived files is outside the tool's control; Git reflogs, branch protection,
  and review are the real controls. The tool no longer pretends otherwise.
- **Archived migrations edit history.** A format migration may change archived
  bytes in a normal commit. Reviewers must treat that commit like any other
  deliberate change.
- **Simpler commands and data.** The seal transaction, manifest parsing,
  identity inventory, and special validation paths are gone; `graph` and
  `tree` work on any current-format archive.
