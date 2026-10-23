---
'adr-kit': minor
---

Lifecycle moves close their gaps, and the CLI stops dropping positional arguments.

- `implement` applies the same readiness gate as `validate <name>` and `instructions`: a proposal citing a missing decision is refused instead of being promoted into a record that fails validation on arrival.
- `implement` and `reject` roll their staged file back when the proposal cannot be removed, the boundary `archive` and `supersede` already held: re-running the command can no longer allocate a second number for the same proposal.
- `record`, `propose`, and `note` join unquoted shell words into one title or text instead of silently dropping every word after the first. Every other command now rejects extra positional arguments instead of ignoring them, `validate` rejects a record name combined with `--all`, and `list`, `status`, `instructions`, `config`, and `update` reject any positional argument. This is a breaking change for callers that passed stray arguments.
- Section-heading comments retain their opening marker across body scans and promotion, so hidden text cannot satisfy required content or become visible after `implement`.
- Body-reference mining (validation and the decision map) reads visible prose only: `ADR-N` mentions inside fenced code or HTML comments are no longer flagged as dangling references or drawn as edges.
- `atlas --out` rejects an empty or directory target with a named remedy instead of a raw EISDIR error; `no ADR matches` names `adrkit list` as the next step; parseArgs errors print one line instead of a stack dump when `dist/cli.js` is run directly.
- The shipped decision-atlas template is held byte-equal to the shared canvas constants by a mirror test, guards its empty-canvas initial view, and the English page no longer emits full-width commas in runtime-joined labels.
- CI installs zsh and fish so the real-shell completion tests run there, and the release workflow runs the suite before publishing. `SECURITY.md` now states the pre-stable support policy instead of a 0.1.x table.
