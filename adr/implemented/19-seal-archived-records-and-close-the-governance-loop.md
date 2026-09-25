---
status: implemented
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-25
commit: 5bb940e
tags: [archive-integrity, agent-integration, governance]
---

# ADR: 19 Seal archived records and close the governance loop

## Problem

ADR 18 adopted the four-directory lifecycle, but the directory names promised
stronger governance than the installed workflows and `validate` could sustain.
Nothing required a scoped supersession check when creating a record, a
shipped-facts check during delivery or review, or any verification that
archived history stays frozen: archived bytes could change silently after
retirement, and no baseline existed that would even allow such a change to be
noticed.

## Decision

- Every numbered record in `adr/archived/` is sealed in
  `adr/archived/MANIFEST.json`, a versioned JSON manifest appended in archival
  order; each entry carries the archive-relative path and the SHA-256 of the
  complete archived file bytes. `adrkit init` writes an empty manifest.
  `adrkit archive` and `adrkit supersede` preflight the manifest, append
  exactly one seal for the final archived file, and roll back the staged file
  when the seal cannot be written, so the active source is never removed on a
  half-finished move. An existing seal is never overwritten.
- Repository-wide `adrkit validate` checks the manifest against the archived
  bytes without Git and fails on malformed, missing, duplicate, extra, and
  unsealed entries and on edited archived content. `adrkit validate --base
  <git-ref>` additionally reads the base manifest and sealed files from Git
  and requires every entry sealed at the base to survive unchanged as a
  prefix of the current manifest, so a coordinated edit of an archived file
  and its hash still fails. `--base` is refused together with single-record
  validation, and CI runs it against the PR base or the push event's previous
  commit.
- The installed `propose`, `record`, and `grill` workflows require a scoped
  supersession review — duplicate, full replacement, partial replacement, or
  independent — before creating a record, with full replacements resolved
  through `adrkit supersede --by` in the same change. `implement` and
  `record` require comparing the record's claimed paths, names, defaults, and
  mechanisms with shipped code and tests. A focused `adrkit-review` workflow
  checks changed records against changed code and reports evidence-backed
  findings. Semantic judgment stays with the agents; the CLI proves only
  structural and cryptographic facts.

## Alternatives considered

- **Re-derive hashes at validation time without a manifest**: rejected. With
  no committed baseline there is nothing to compare against, so an edit made
  before validation is invisible.
- **A similarity score or CLI classifier for supersession**: rejected.
  Titles and tags cannot prove semantic overlap; automatic classification
  would create false authority without removing the need for judgment.
- **Treat the manifest as a generated index of active records**: rejected.
  It is a product-owned seal for frozen history only; the active inventory is
  discoverable through `adrkit list` and needs no second index to keep in
  sync.
- **Enforce append-only against a local `HEAD^`**: rejected. The right
  comparison is the actual review base; a local parent guess is wrong for
  merges, stacked branches, and force-pushes, which is why the CI step reads
  the event's comparison commit and skips only when none exists.

## Consequences

Every archive-capable repository must carry a valid manifest: `init` writes
one, and repositories predating this change are sealed once by hand. Archive
and supersede now perform a two-file write with rollback, and CI needs full
git history. The agent workflows carry obligations machine validation cannot
prove, which the review workflow and human reviewers own. The maintainer
raised the direction and confirmed the design; the full deliberation lives in
the OpenSpec change `close-agent-note-governance-loop`.
