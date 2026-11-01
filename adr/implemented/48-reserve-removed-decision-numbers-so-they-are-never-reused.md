---
status: implemented
date: 2026-11-01
description: "Read when changing how decision numbers are allocated, or touching the decision-sequence journal."
raised-by: human
decided-by: human
created: 2026-11-01
commit: 84f2dec
paths:
  - src/core/repository.ts
  - src/commands/implement.ts
  - src/commands/record.ts
  - src/commands/delete.ts
  - adr/.decision-sequence
---

# ADR: 48 reserve removed decision numbers so they are never reused

## Problem

ADR 47 accepted that deleting the highest-numbered record frees its number for
reuse, betting on the delete preflight to prove nothing referenced it. The
maintainer rejected that trade-off after review: number allocation must behave
identically whether or not a deletion happened, because a number that comes
back is not stable — prose outside the scanned corpus (chat logs, commit
messages, someone's memory) can still name the old record, and the reuse is
invisible until it collides. "Never reuse" must hold for every deletion, not
only for deletions below the maximum.

## Decision

The decision-number line is an append-only journal, `adr/.decision-sequence`;
the numbered file names are its current projection. Every number event
appends one line: writing a numbered record journals its number (`writeRecord`
appends under the write lock, so competing same-number writers still arbitrate
first), and `adrkit delete` journals the number of the record it removes — the
one event that can lower the surviving-file maximum. Allocation is a maximum over the journal and the
surviving inventory plus one, so no deletion, however high, can hand its
number to a later decision, and allocation behaves identically whether or not
deletions happened.

The journal is a dotfile at the `adr/` root: outside the record inventory,
the citation scan, and `adrkit list`, so it adds no reading cost and no
validation surface. It is ordinary Git-tracked history. Writers only append,
so no lock is needed beyond the small O_APPEND write. A crash after the file
lands but before its journal line self-heals — the surviving-file maximum
keeps the line monotonic until the journal catches up. Journaling a removal
before removing the record means a failed removal still cannot hand the number
onward; a retry appends a harmless duplicate.

## Alternatives considered

- **Keep ADR 47's reuse of the highest freed number**: rejected by the
  maintainer. The preflight proves the repository holds no reference, but
  stability is a promise about the number line, not about the current tree.
- **Journal only removals** (an `adr/.removed-numbers` ledger, ADR 48's first
  cut): rejected in review as a deletion special case bolted beside the
  allocation scan — two mechanisms where one belongs. Journaling allocations
  too makes the number line one append-only sequence and `delete` an ordinary
  number event.
- **Store the watermark in `adr/config.yaml`**: rejected. Config is
  user-edited and strictly validated; every implementation would rewrite it,
  adding machine state to a human file and merge conflicts for teams.
- **Derive ever-used numbers from Git history**: rejected. It fails the
  no-Git fallback the rest of the tool supports, and costs a history walk per
  allocation.
- **Tombstone records to hold numbers**: rejected again, as in ADR 47 — a
  permanent record kept only to hold a number re-creates the noise problem
  one level down.

## Consequences

### Verification

- Every numbered record write journals its number; deleting the
  highest-numbered record journals it again, the next allocation is higher,
  and the deletion test asserts both journal entries and the removed number's
  non-return.
- `nextDecisionNumber` reads no state that a deletion can lower: the maximum
  over files and ledger is monotonic by construction.
- The pre-commit hook is unchanged: the journal is not a record, and a staged
  journal line rides along with the commit that caused it.

### Trade-offs

- **One more dotfile in `adr/`.** A user who prunes dotfiles by hand can drop
  reservations made before the last allocation; Git restores it, and the
  ledger is append-only, so the risk is limited to uncommitted removals.
- **Manual `git rm` bypasses the journal.** A hand removal of a number
  outside `adrkit delete` is journaled only if a later removal or allocation
  exceeds it; the hook cannot distinguish a deliberate checked removal from a
  manual one, and the README keeps naming `adrkit delete` as the only
  sanctioned path.

This record amends ADR 47, which carries the corresponding amendment note
under its own Later changes: the reuse trade-off there is withdrawn, and the
preflight design of that record stands unchanged.
