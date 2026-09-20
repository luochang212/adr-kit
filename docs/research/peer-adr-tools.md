# Peer ADR tools: what they do and what this project borrows

Two public projects ship under the same name and target the same audience:
[`rvdbreemen/adr-kit`](https://github.com/rvdbreemen/adr-kit) and
[`kschlt/adr-kit`](https://github.com/kschlt/adr-kit). Both are Python and both
make retrieval and enforcement, not the record format, the product. This project
is the opposite: TypeScript, `yaml` the only runtime dependency, one `adr/`
directory, and a record model with two provenance axes, supersede history,
`adrkit graph`, and the `## Deliberation` tree.

This note records what each peer does and which ideas are worth importing. It
was written by reading both repositories (cloned and inspected 2026-09-21) and
testing the candidate ideas against this codebase. ADR 3 and ADR 4 are the
decisions that shaped the current model; the OpenSpec change
`add-peer-landscape-research` carries the planning trail.

## rvdbreemen/adr-kit - "decisions your agents actually follow"

One deterministic, stdlib-only Python engine; 17 workflows; four native clients
(Claude Code, Codex, Copilot CLI, OpenCode); a key-free MCP server; selectable
formats (MADR default, Nygard, canonical).

- **Enforcement before / while / after editing.** Ranked context injection, then
  in-flight nudges, then declarative commit and PR judging with `file:line`
  citations and fail-closed oversized diffs.
- **Index-first retrieval.** A generated `ADR-INDEX.json` queried by task
  description returns a ranked, explained, authority-aware shortlist (Accepted
  governs, Proposed advises, historical opt-in).
- **Guided authoring.** A grill finishes Proposed records one evidence-backed
  question at a time; `adr-readiness` separates mechanical defects from
  unresolved human decisions.
- **Staleness guardian.** Scheduled drift, missing-decision, and retirement
  audits; a deterministic tier plus an opt-in LLM tier.

## kschlt/adr-kit - "keep agents architecturally consistent"

Three layers, exposed through six MCP tools. `adr_preflight` answers
ALLOWED / REQUIRES_ADR / BLOCKED before a choice; a pre-write quality gate
rejects vague decisions; a `policy:` front-matter block compiles to ESLint and
Ruff rules run pre-commit, pre-push, and in CI; `adr_analyze_project` scans an
existing codebase and proposes decisions. Enforcement is deterministic; its
ESLint prose-mining adapter is the unreliable part.

## Candidates, after review

| # | Candidate | Verdict |
|---|---|---|
| 1 | Indexed / ranked retrieval | Rejected |
| 2 | Proposal quality gate | Rejected: contradicts decide-first |
| 3 | Staleness / retirement audit | Rejected: no machine-readable code link |
| 4 | `## Verification` + `adrkit check` | Deferred: product-identity change |
| 5 | Implicit-decision discovery | Reduced: produce an agent prompt, never records |
| 6 | Sharper agent contract | Small: a read-only vs mutating command table |
| 7 | Dangling-reference check | Accepted and implemented |

### 1. No index; read front matter first

An index is derived data that must be regenerated and drift-checked (the peer
ships `adr-index --check`). These records are already an index: their front
matter carries `status`, `date`, `raised-by`, `decided-by`, `created`,
`commit`, and `tags`. The cheap move is a reading rule - skim front matter to
shortlist, then read the selected records in full - not a generated file.

### 2. Proposals stay weak

ADR 3 and ADR 4 made `decide` the default and `propose` the exception. A
proposal quality gate would spend engineering on the path we deliberately
de-emphasize.

### 3. Staleness audit: not now

Tested against this codebase:

- There is no machine-readable link from a record to code: `src/core/adr.ts`
  has no `verified_in` or scope field, `commit` only records the HEAD when the
  record was written, and `tags` are themes, not code terms.
- Extracting path-like tokens from prose is noisy: on the four records it found
  14 tokens, 6 of them basenames that do not resolve at the repository root.

The stronger signal ("evidence moved since the decision") needs a new,
continuously maintained metadata field - the same maintenance cost that sank the
index idea. The model here is "records are history, code is current", so a stale
record is retired by a human supersede, not monitored by a scanner.

### 4. Verification and enforcement: deferred

Enforcement is the peers' core value, but it changes this product from a record
manager into a linter, needs a rule DSL and diff handling, and many
architectural decisions are not machine-checkable (the peer's own README admits
this). Revisit only if recorded decisions are repeatedly ignored. A lightweight
`verified_in` pointer would be the first step.

### 5. Implicit-decision discovery produces a prompt, not records

The right shape is a read-only scan that produces an agent prompt or candidate
topic list, never records: a decision needs the rejected alternatives, which
code cannot reveal.

### 6. Agent contract: a read-only vs mutating command table

The peer's agent brief opens with a table marking every tool read-only or
mutating and flagging human-gated steps. The same small table could be added to
`AGENTS.md` / the skills.

### 7. Dangling-reference check: implemented

`adrkit graph` mines `ADR-N`/`ADR N` references from bodies
(`src/core/graph.ts:37`) and keeps only those that resolve to a node
(`graph.ts:93`), so a reference to a missing decision was silently dropped;
`validate` checked only `superseded-by` in front matter
(`src/core/validate.ts:294`). Verified before the fix: a body naming `ADR-99`
passed `adrkit validate --all`. `adrkit validate` now reports the dangling
reference, reusing the graph's vocabulary.

## Non-goals

- **MCP server, hooks, in-flight injection** - need a long-running process and
  client event surfaces.
- **Selectable formats (MADR / Nygard / canonical)** - the format is the product
  and is machine-checked.
- **LLM judges** - the trust model is deterministic declarations and validation.
- **ESLint / Ruff rule generation** - couples the tool to two language
  ecosystems.
- **Generated index and retrieval metadata** (`topics` / `aliases` /
  `components` / `symbols`) - derived and maintained; front matter suffices.
- **`status_history` in the body** - git is the history.
- **Symmetric `related`** - duplicates what `graph` mines.
- **`deciders` array** - `decided-by` is deliberately single-axis.

## Takeaway

The peers compete on enforcement and retrieval; this project's differentiation is
the record model (two provenance axes, the deliberation tree, a machine-checked
format) and its minimalism. The borrowable ideas are small safety and contract
mechanisms, not the enforcement layer.
