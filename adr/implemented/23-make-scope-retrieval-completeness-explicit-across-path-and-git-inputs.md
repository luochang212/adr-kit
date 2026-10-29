---
status: implemented
date: 2026-10-14
description: "Read when retrieving decisions from paths or Git changes and reporting incomplete scope coverage."
raised-by: human
decided-by: agent
created: 2026-10-14
commit: f768729
paths:
  - src/core/relevant.ts
  - src/core/glob.ts
  - src/core/git.ts
  - src/core/repository.ts
  - src/commands/relevant.ts
  - src/core/cli-options.ts
  - src/cli.ts
---

# ADR: 23 Make scope retrieval completeness explicit across path and Git inputs

## Problem

ADR 22 introduced paths-based retrieval, but bounded directory walks silently truncate or skip unreadable directories. Reviewers must manually assemble changed paths and can overlook deletions or rename origins. An apparently empty or complete list is misleading when input acquisition was partial; a valid match set also says nothing about unscoped decisions. Research identified this gap in the current core, not just a peer feature.

## Decision

Scope retrieval extends ADR 22, preserving ADR 20's authority groups and minimal glob dialect. `relevant` takes exactly one input source: explicit paths, `--base <ref>` (base commit to working tree plus non-ignored untracked files), or `--staged` (index only). Git inputs are literal repository-relative file paths; they never trigger directory walks, include deletions and both rename endpoints, and are acquired with argument arrays and NUL-delimited name-only Git output with rename detection disabled. A base is the exact supplied commit, not an implicit merge-base. Glob matching preserves newline filenames and requires a full path match.

Directory retrieval retains its 2,000-file budget and known exclusions. Truncation and filesystem errors return useful matches with explicit diagnostics and a non-zero CLI exit. A missing explicit path still represents a planned file; other inspection errors do not silently become missing files. Git/ref failures and malformed/unreadable active records are fatal, with no partial corpus presented as complete. Archived files are not read by this active query. Active records lacking paths are counted and named as a coverage limitation, not a runtime failure: `list` and full reading remain necessary even when scoped records match.

The user requested and authorized both implementation batches. The agent chose this input and failure contract; raised-by human records the requested work, and decided-by agent records the design judgment. This is a partial extension of ADR 22, not a replacement. Evidence guidance remains in existing skill/Markdown surfaces under ADRs 1, 3, 19 and 21; no additional evidence schema is chosen.

## Alternatives considered

- **A separate review-context command and matcher**: unnecessary duplication of the existing relevant core and lifecycle meaning; input acquisition is the missing capability.
- **Warnings with successful exit on partial search**: useful for humans but unsafe for scripts treating success as completed input acquisition; retain matches and signal incompleteness through exit status.
- **Fail retrieval because some records have no paths**: optional scopes are part of ADR 22 and unscoped decisions may be global; report their count and preserve inventory reading instead.
- **Skip malformed records and continue**: could hide current authority. Keep the active corpus parse error fatal, consistent with ADR 16.

## Consequences

Delivered in `add-change-context-and-evidence-workflows`: `test/relevant.test.ts` covers the input and completeness contract, `test/glob.test.ts` covers newline boundaries, and integration tests cover evidence guidance on both installed clients. The built CLI and local integrations are updated; this working-tree delivery is not an npm publication.


### Verification

Real Git fixtures cover staged versus unstaged/untracked, exact base changes, rename/deletion, unusual names, nested ADR roots, empty diffs, invalid refs and non-Git projects. Directory tests cover complete and truncated searches plus read failure. Output identifies scope gaps even with matches; archived records are not parsed. CLI errors and completion agree with the input contract. Bilingual docs and mirrored skills pass tests; typecheck, build and repository validation pass.

### Trade-offs

Exit non-zero on partial search changes caller behavior deliberately; docs explain reading partial matches and narrowing paths. Git invokes local Git but no shell or external diff/textconv, and buffer failures are fatal rather than parsed as partial. Optional scopes still cannot guarantee semantic recall. This implementation does not prove code compliance or that an agent actually read a returned record.

