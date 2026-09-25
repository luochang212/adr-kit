# Design

## Context

See `proposal.md` for motivation. ADR 18 fixes the four directories, stable numbers, retention of formal rejections, and the distinction between shipped facts and decision rationale. The current CLI already parses and validates those directories; `src/core/tool-integrations.ts` mirrors the checked-in skills; `adrkit validate` is the existing repository gate. The main `record-lifecycle` OpenSpec still describes the pre-ADR-18 `accept` command, so its requirements must be reconciled rather than used as the new design's source of truth.

## Goals / Non-Goals

**Goals:** Make record creation, delivery, review, and retirement one coherent agent-and-CLI workflow; make the archive's frozen claim testable; keep semantic judgment with the agent and human reviewer.

**Non-Goals:** Infer semantic supersession or shipped status from code automatically; add class folders, a fifth lifecycle state, automatic record deletion, a general code-review system, task-end reminders deferred by ADR 17, or backwards-compatibility paths for older ADR Kit layouts.

## Decisions

### Put semantic decisions in installed workflows, not a new CLI classifier

Update `adrkit-propose`, `adrkit-record`, and `adrkit-grill` to perform a scoped search before authoring, compare overlapping active records, and choose duplicate/reuse, full supersession, partial supersession, or independent choice. Update `adrkit-implement` to verify shipped facts and revisit overlap; add `adrkit-review` as a focused workflow for reviewing ADR/code coherence. Keep its description narrow so it does not intercept ordinary code review. The root standing-orders template names the obligation briefly and links or routes to the relevant skill; it does not reproduce the whole procedure. The mirror test continues to require byte-exact `SKILL.md`/integration correspondence.

This follows DSH's division of responsibility without pretending titles, tags, or a `git diff` prove that two decisions mean the same thing. An automatic similarity score or generic review skill would create false authority and extra dependencies. Existing `adrkit supersede` remains the explicit full-replacement action; partial overlap is described and cross-referenced in the records.

### Seal archived bytes in `adr/archived/MANIFEST.json`

`adrkit init` writes an empty versioned manifest. Each entry contains the archive-relative `N-slug.md` path and a SHA-256 of the complete final file bytes; entries are appended in archival order. `archive` and `supersede` preflight the source, target, and manifest, produce the final archived content, add exactly one entry, then move the record. Refuse duplicate paths and inconsistent prior seals; failure must not silently remove the active source. Initialize this repository's existing archived ADRs in the same implementation change, without inventing an old-layout migration workflow.

`adrkit validate` checks that the manifest parses, contains no duplicate/unsafe paths, covers exactly the archive's numbered Markdown records, and matches their bytes. A targeted `validate <N>` for an archived record checks that record's entry. The manifest is a product-owned file, not a second decision format or a generated index of active records. Node's built-in crypto is sufficient; `yaml` remains the only runtime package dependency.

A plain hash manifest catches accidental archived-file edits but not coordinated edits to a file and its hash. Therefore repository-wide `validate --base <git-ref>` reads the base manifest and sealed files from Git, verifies the base snapshot, and requires its entry sequence to be an unchanged prefix of the current manifest. It rejects a rewritten or deleted prior seal even if the current file and manifest agree. If the base has no manifest, it has no prior seals; the current repository still needs complete valid seals. Git is required only when `--base` is explicitly requested. `--base` with a single-record query is rejected because append-only history is a corpus property.

CI fetches the base commit and runs normal validation plus base-aware validation against the PR base SHA or the push event's previous SHA. This guards changed archived history in the actual review diff rather than assuming the local `HEAD^` is the right comparison. Errors distinguish malformed manifest, missing file, hash mismatch, and unreadable Git base.

### Keep source-of-truth roles separate

Active implemented ADRs remain current for factual paths, names, defaults, and mechanisms; a changed choice gets a new record. Archived ADRs never receive factual refreshes or link repair inside their sealed bodies. Review and archive skills redirect inbound active references to current authority, keep an intentional historical link when appropriate, and do not treat archived outbound links as current documentation. `adrkit validate` checks structural and cryptographic facts; the skills and review report semantic mismatches that cannot be mechanically proved.

## Risks / Trade-offs

- **Manifest creates a shared file touched by archives** → Keep it small and append-only; new entries are rare and conflicts are resolved by revalidating both archive operations.
- **Two-file lifecycle move can fail midway** → Preflight all inputs and use staged writes/rollback so the active source is not removed until the archived file and seal are durably written; tests cover a failed write path.
- **Git baseline may be unavailable in a shallow checkout** → CI fetches required history; `--base` fails clearly rather than weakening the check.
- **Semantic checks remain voluntary outside agent workflows** → State that boundary explicitly. Machine validation must not claim to prove implementation or supersession semantics.

## Deployment

This repository starts with two archived ADRs. The implementation seals their current bytes and updates CI in the same change. New repositories get the empty manifest from `adrkit init`; no old-layout migration command or compatibility parser is added. A rollback reverts code and manifest changes together before further archives are made.
