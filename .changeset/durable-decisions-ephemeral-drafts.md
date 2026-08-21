---
"adr-kit": minor
---

Redesign the record model around durability. Decisions are durable records in
`adr/decisions/`; proposals are ephemeral drafts in a gitignored
`adr/.drafts/`. `adrkit accept` promotes a draft into a numbered decision and
deletes it; `adrkit reject` discards a draft without leaving a record. The
`rejected` status and the `proposed/`/`rejected/` folders are gone — rejection
is recorded in a decision's `Alternatives considered`. `init` creates only
`decisions/` (plus a `.gitignore` that keeps drafts out of git). `decide`,
`accept`, and `supersede` stamp a `commit` field with the short HEAD hash when
under git. `validate` checks durable decisions only; a draft is validated by
`accept` right before it is promoted.

Breaking: the three-folder layout and the `rejected` record state are removed.
