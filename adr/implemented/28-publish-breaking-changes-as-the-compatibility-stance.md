---
status: implemented
date: 2026-10-21
description: "Read when changing public formats or commands and explaining breaking upgrades to adopters."
raised-by: human
decided-by: human
created: 2026-10-21
paths:
  - AGENTS.md
  - README.md
  - README.zh.md
---

# ADR: 28 publish breaking changes as the compatibility stance

## Problem

`AGENTS.md` justified the no-shims stance with a factual claim: "the maintainer
is the only current user." That premise no longer holds. The package is
published, adoption is visible, and ADR 30 now carries instructions for
agents to upgrade and migrate other people's records. A stance argued from
"nobody else uses this" quietly prices breaking changes at zero and invites
exactly the silent break the migration path exists to prevent. The real
obligation — announce the break, name the fix, migrate what is mechanical and
say plainly what is not — stayed implicit while the premise did the arguing.

## Decision

- **The compatibility stance is published, not derived from a user count.**
  ADR Kit is pre-stable and ships breaking changes deliberately: no
  forward-compatibility shims, deprecation windows, grandfather markers, or
  migration commands, and no release promises that old records or integrations
  keep working.
- **A break is a user-facing change.** A change to the record format or the
  command surface states itself where users meet it — the record-format
  reference, the README upgrade section, and the standing orders — and
  `adrkit validate` names the exact fix.
- **Upgrading is the supported path, not compatibility.** Agents upgrade the
  package, migrate active records where the change is mechanical, and report a
  record that cannot be carried over instead of forcing a rewrite (ADR 30). A
  migration is never assumed to exist. Archived records are ordinary Git-tracked
  history: change them only in deliberate, explained commits; there is no seal.
- **`AGENTS.md` stops asserting a single user** and stops gating the stance on
  a hypothetical future adopter. The stance holds because the product is
  pre-stable, not because nobody is watching.

## Alternatives considered

- **Keep the single-user premise until an outside adopter is confirmed.**
  Rejected: adoption is already visible in npm traffic and in the known 0.18.1
  repository, and the premise was doing real work — it made breaks look free.
- **Add compatibility shims or a deprecation window now that users exist.**
  Rejected: ADR 3, ADR 18, and ADR 25 already declined forward compatibility,
  and a pre-stable tool that maintains two formats pays a permanent cost for a
  temporary courtesy.
- **Let the README carry the whole stance.** Rejected: the reader who meets the
  failure is the agent, and the standing orders are the only surface it reads
  every task (ADR 30).
- **Promise a major-version compatibility boundary.** Rejected: versions are
  pre-1.0, and nothing in the release flow enforces format compatibility; a
  promise would need machinery this project does not carry and would be broken
  by the first format change anyway.
- **Announce breaks only in the changelog.** Rejected: a changelog entry is
  read after the failure, not before it; the upgrade section and validation
  errors are where the reader already is.
- **Promise that every break has a migration.** Rejected: a migration is only
  mechanical when the shape moved. A semantic change can leave records to be
  re-derived or retired deliberately, and promising otherwise would turn an
  honest failure into a forced rewrite of history.

## Consequences

### Verification

- `README.md` and `README.zh.md` state that no release promises forward
  compatibility, that upgrading is the supported path, and that archived records
  change only in deliberate, explained commits.
- `AGENTS.md` states the stance without a user-count premise and without the
  "revisit if an adopter appears" gate.
- `npm run typecheck`, `npm test`, and `adrkit validate --all` pass.

### Trade-offs

1. Users must upgrade on the tool's schedule and run `adrkit validate --all`
   afterward; there is no long-term-support line, and the README says so
   instead of implying one.
2. An adopter who needs a stable format gets no guarantee, no long-term-support
   line, and not always a migration: a semantic change can force a record to be
   re-derived or retired deliberately. The README and the standing orders say
   so instead of promising a rewrite.
3. The stance now lives in prose rather than being enforced by a version
   policy; a future release that wants a compatibility promise must add the
   machinery, not just the sentence.

### Later changes

**Amended by ADR 43:** the running break notes moved from the README upgrade
section to `docs/upgrading.md` and `docs/zh/upgrading.md`, and both READMEs
keep a short Stability note carrying the stance above, placed after the Record
format section. The surfaces are now the record-format reference, the README
stability note and the upgrade guide, and the standing orders; the
announcement duty is unchanged.
