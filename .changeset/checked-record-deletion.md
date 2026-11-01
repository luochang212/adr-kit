"adr-kit": minor
---

Provide `adrkit delete` as the checked removal path for a record that should
never have existed — noise, a duplicate, a routine change recorded as a
decision.

- `adrkit delete <name>` removes a record from `proposed/`, `implemented/`, or
  `rejected/` after checking the repository: it refuses while code cites the
  record (`@adr N`) or another record names the number in prose or
  `superseded-by`, listing every stranded reference, and it never deletes
  archived records. Deleting a rejection prints the durable-warning reminder
  first. Mentions in user-owned files (`AGENTS.md`, `adr/notes.md`) are
  reported, never rewritten.
- Decision numbers form an append-only journal at `adr/.decision-sequence`:
  allocation and removal both append to it, so a removed number is never
  reallocated, not even when the deleted record was the highest-numbered one.
- The pre-commit hook no longer fails every staged deletion of a numbered
  decision. It fails when the deletion strands a citation or a record
  reference — the objective defect — and still fails any staged deletion of an
  archived record.
