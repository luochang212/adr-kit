---
status: implemented
date: 2026-11-01
description: Read when changing the record format or deciding what provenance records carry.
raised-by: human
decided-by: human
created: 2026-11-01
paths:
  - src/core/adr.ts
  - src/core/templates.ts
  - src/core/validate.ts
  - src/core/decision-atlas.ts
  - src/commands/implement.ts
  - src/commands/record.ts
  - docs/**
  - test/**
---

# ADR: 49 keep git provenance out of the record format

## Problem

Implemented records carry an optional `commit` front-matter field: a short
HEAD hash stamped by `record` and `implement` at the moment the file is
written. The field predates this repository's own ADR practice — it arrived
with the `adr/.drafts/` model and survived every redesign since — and no
record ever claimed it, so it has never faced the selection judgment every
other field passed.

Inspection found it write-only. Templates stamp it, the parser reads it,
validate checks its shape, and the atlas payload carries it — but no theme,
view, or command ever consumes it; even the atlas footer pin uses the build
commit, not the per-record field. The shape check cannot verify the hash
resolves, so after a history rewrite the field dangles silently while
validation stays green. And the pointer is circular: a hash is resolvable
only inside this repository's Git history, and wherever Git is available,
the same fact is derivable — the parent of the commit that added the record
file names the state the decision was recorded against. The field duplicates,
unverifiably, information that history already guarantees, against the grain
of ADR 30's "history is Git's job".

## Decision

Remove git provenance from the record format. `commit` leaves the canonical
front-matter order, the parser, the templates, the validation rules, and the
atlas payload; `record` and `implement` stop calling `gitHead` (the atlas
build pin keeps its own, separate use). A record still carrying the field
reports `unknown front matter field "commit"`, the same drift signal every
removed field uses, and the upgrade guide names the mechanical migration:
delete the line. Lifecycle moves keep refusing unknown fields before
rewriting front matter, so no move can silently drop the key from a record
that still has it. The removal ships as a breaking format change in the
pre-stable stance of ADR 28: stated in the record-format reference, the
upgrade guide, and the standing orders, with this repository's records —
archived included — migrated in the same change.

## Alternatives considered

- **Keep the field as optional metadata**: rejected. A write-only field with
  no consumer is cost with no behavior; every format change pays for a key
  nothing reads.
- **Render it in the atlas instead of removing it**: rejected. That would
  build product surface to justify a duplicated pointer, and the anchor
  becomes a stale link the first time history is rewritten.
- **Verify the hash resolves and fail validation on a dangling one**: 
  rejected. It converts every deliberate history rewrite into a validation
  break across all records, enforcing the coupling the field creates rather
  than removing it.

## Consequences

The format contract is smaller and single-sourced: what a record says about
itself is status, dates, provenance declarations (`raised-by`, `decided-by`),
description, and scopes; where it landed is Git's to tell. The trade-off:
the "code state at recording time" anchor the field carried is gone. What is
lost is a copy, not the fact — the anchor remains derivable from history,
and the stamped value was never verified against it anyway. External
adopters' records fail validation until the line is deleted, which is the
published breaking-change path, not damage.

### Verification

- `adrkit record` and `adrkit implement` write no `commit` field, inside or
  outside a Git repository; the template cannot emit one.
- A record carrying `commit:` fails `adrkit validate` with
  `unknown front matter field "commit"`, and `archive`/`supersede` refuse to
  move it rather than dropping the key silently.
- The atlas payload carries no per-record commit; the footer still pins the
  build commit through `gitHead`, whose only remaining caller is the atlas.
- This record was created by `adrkit record` after the change: its front
  matter demonstrates the shape, and the repository's 40 carrying records
  were migrated in the same commit, archived ones included.
