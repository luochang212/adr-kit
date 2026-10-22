---
status: superseded
date: 2026-10-22
raised-by: human
decided-by: human
created: 2026-10-21
superseded-by: 30
archived: 2026-10-22
archive-reason: superseded by ADR 30
paths:
  - src/core/tool-integrations.ts
  - src/core/validate.ts
  - src/core/adr.ts
  - src/core/files.ts
  - src/core/repository.ts
  - src/core/markers.ts
  - src/commands/validate.ts
  - src/commands/list.ts
  - src/commands/show.ts
  - src/commands/archive.ts
  - src/commands/supersede.ts
  - test/commands.test.ts
  - skills/adrkit-init/SKILL.md
  - AGENTS.md
  - test/lifecycle.test.ts
  - test/integrations.test.ts
---

# ADR: 27 make format drift self-healing for agents

## Problem

Records outlive the CLI that wrote them. ADR 3 and ADR 18 let the format break
on purpose, and the README says so, but the reader who actually meets the
failure is the agent: after a user upgrades adr-kit, `adrkit validate` starts
rejecting records the previous release accepted. The standing orders said
nothing about that case, so an agent either preserved the old shape or
hand-edited around the validator. The README upgrade note is human-facing and
the agent never reads it, so it could not close the gap.

The archive made the gap unfixable. Sealed bytes cannot change without
breaking the seal, and rewriting the seal erases the append-only evidence
`validate --base` exists to prove. Yet `validateRecord` still applied the
current front-matter and section rules to `archived/`, so a format change
could leave a repository with errors no legal move could clear.

## Decision

- **The standing orders carry the remedy.** When `adrkit validate` reports
  unknown fields, missing sections, or parse errors on records an older
  release wrote, the agent treats it as format drift rather than damage:
  upgrade the `adr-kit` package to the latest stable release, migrate the
  active records to the current format, and re-run `adrkit validate --all`.
  The clause lives in the same section the agent already reads at task start,
  not in human-facing documentation.
- **Sealed records are judged by their seal, not the current rules.**
  Validation reads archived identities independently of current format
  requirements. The stable filename supplies the number; parseable metadata
  supplies optional title and successor diagnostics. Archived bodies and
  references are not revalidated, while duplicate numbers, active references,
  and stale code citations remain checked. Single-record validation uses the
  same inventory and query matching. `recordSealIssues`,
  the manifest checks, and `validate --base` still prove the bytes never
  changed. The invariants are enforced at freeze time instead: `adrkit archive`
  and `adrkit supersede` validate a record before sealing it, so a malformed
  record cannot enter the archive.
- **The derived marker changes with the wording.** The standing-orders body's
  fingerprint is computed from its text, so editing the clause makes every
  previously pasted section report drift until it is refreshed from the init
  skill.

## Alternatives considered

- **Document the migration only in the README.** Rejected: the human would
  have to notice the failure and relay the instruction, while the agent is the
  one holding the validation error and the one able to fix the records.
- **Add a hint to `validate` output and leave the standing orders alone.**
  Rejected: it splits one rule across two surfaces and still leaves the
  archive unfixable, because the failure is structural, not informational.
- **Keep shape rules for archived records and ship a seal-rewriting
  migration.** Rejected: a rewritten seal destroys the append-only guarantee
  that ADR 19 built, and `validate --base` would correctly reject the result.
- **Treat the archived exemption as a compatibility shim.** Rejected: it is
  not a shim. Frozen bytes cannot be repaired, so their contract is the seal;
  re-judging them by rules written later would guarantee unfixable errors.

## Consequences

### Verification

- `test/archive-seal.test.ts` models sealed records with an unknown field,
  an obsolete status, an obsolete title layout, and historical references.
  Repository and single-record validation pass; subsequent byte changes fail
  the seal check, active references resolve, and code citations remain rejected.
- `test/commands.test.ts` proves even an archive without current front matter
  validates by its seal and detects subsequent edits.
- The archive-tolerant inventory backs `list` and `show`, number allocation
  reads decision filenames, and lifecycle commands resolve implemented records
  only. A sealed archive written by an older format therefore does not block
  discovery, a new `adrkit record`, or `adrkit archive`/`adrkit supersede`;
  `test/archive-seal.test.ts` covers each path.
- `test/lifecycle.test.ts` edits a sealed record and expects the seal mismatch,
  not a format rule, to be the failure.
- `test/integrations.test.ts` holds the shipped init template and this
  repository's `AGENTS.md` to the clause and its archived boundary.
- `npm test`, `npm run typecheck`, and `adrkit validate --all` pass.

### Trade-offs

1. Archived records no longer receive shape checks at validation time. A
   record that was invalid when sealed stays invalid, but the archive command
   refuses to seal an invalid record, so the window is closed at the boundary.
2. Users whose `AGENTS.md` holds the previous section see the drift note from
   `adrkit list` until they refresh it once from the init skill.
3. The upgrade clause adds a fifth paragraph to the standing orders every
   agent reads at task start. Accepted because the alternative is an agent
   silently preserving a format the CLI already rejects.
4. `adrkit graph` and `adrkit tree` still parse the current format and can
   fail on a legacy sealed archive. That is accepted under the
   no-forward-compatibility stance: migrate before graphing; the tolerant
   inventory above keeps discovery and lifecycle work usable.
