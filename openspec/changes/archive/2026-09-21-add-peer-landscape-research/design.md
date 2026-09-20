## Context

See proposal.md - Why. Two peers were cloned and read on 2026-09-21:
`rvdbreemen/adr-kit` (Python, ~0.57.0, 9 stars, branch `dev`) and
`kschlt/adr-kit` (Python, 5 stars, `main`). This repository is
`luochang212/adr-kit`: TypeScript, `yaml` the only runtime dependency, one
`adr/` directory, workflow skills under `.agents/`, and a record-model-first
design (two provenance axes, supersede history, `graph`, `## Deliberation`).

This document was revised after the initial README pass: the repositories were
cloned, each candidate was tested against this repository, and the two survivors
were taken through a worth-fix review.

## Goals / Non-Goals

**Goals:**
- Record what each peer optimizes for, sourced from code, not just the README.
- Separate what is worth importing from what conflicts with this product.

**Non-Goals:**
- Deciding the roadmap here.
- Copying peer features wholesale.

## What each peer does

### rvdbreemen/adr-kit - "decisions your agents actually follow"

One deterministic stdlib-only Python engine; 17 workflows; four native clients;
a key-free 7-tool MCP server; selectable formats. Its layers:

- **Enforcement before / while / after editing**: ranked context injection,
  in-flight nudges, declarative commit/PR judging with `file:line` citations.
- **Index-first retrieval**: a generated `ADR-INDEX.json` queried by task
  description, authority-aware (Accepted governs, Proposed advises, historical
  opt-in).
- **Guided authoring**: a grill that finishes Proposed ADRs one evidence-backed
  question at a time, and `adr-readiness` separating mechanical defects from
  unresolved human decisions.
- **Staleness guardian**: scheduled drift/coverage/retirement audits; the
  deterministic tier plus an opt-in LLM tier.

### kschlt/adr-kit - "keep agents architecturally consistent"

Three layers exposed through six MCP tools. `adr_preflight` returns
ALLOWED / REQUIRES_ADR / BLOCKED; a pre-write quality gate rejects vague
decisions; a `policy:` front-matter block compiles to ESLint/Ruff rules run
pre-commit, pre-push, and in CI; `adr_analyze_project` scans an existing
codebase and proposes decisions. Enforcement is deterministic; its ESLint
prose-mining adapter is the unreliable part.

## Where this repository stands

- **Record model**: strict machine-checked format, two provenance axes
  (`raised-by`/`decided-by`), ephemeral drafts, supersede history, `graph`,
  `## Deliberation`. Neither peer has the provenance model or the tree.
- **Distribution**: skills under `.agents/`; no MCP, hooks, service, or
  credentials.
- **Context cost**: the reading rule reads every decision in full; ADR 4
  accepted that. The peers answer it with a generated index.
- **Enforcement**: none; `validate` checks the record's shape, not code.

## Candidates, after review

| # | Candidate | Verdict |
|---|---|---|
| 1 | Indexed / ranked retrieval | Rejected (see 1) |
| 2 | Proposal quality gate | Rejected: contradicts decide-first |
| 3 | Staleness / retirement audit | Rejected after worth-fix: no machine-readable code link |
| 4 | `## Verification` + `adrkit check` | Deferred: product-identity change |
| 5 | Implicit-decision discovery | Reduced: produce an agent prompt, never records |
| 6 | Sharper agent contract | Small: a read-only vs mutating command table |
| 7 | Dangling-reference check | Accepted: opened as its own change |

### 1. No index; read front matter first

An index is derived data that must be regenerated and drift-checked (the peer
ships `adr-index --check`). These records are already an index: their front
matter carries `status`, `date`, `raised-by`, `decided-by`, `created`,
`commit`, and `tags`. The cheap move is a reading rule - skim front matter to
shortlist, then read the selected records in full - not a generated file.

### 2. Proposals stay weak

ADR 3 and ADR 4 made `decide` the default and `propose` the exception. A
proposal quality gate would spend engineering on the path we deliberately
de-emphasize. Rejected.

### 3. Staleness audit: worth-fix says no

Tested against this repository:
- There is no machine-readable link from a record to code: `src/core/adr.ts`
  has no `verified_in`/`scope` field; `commit` only records the HEAD when the
  record was written; `tags` are themes, not code terms.
- Extracting path-like tokens from prose is noisy: on the four records it found
  14 tokens, 6 of them basenames that do not resolve at the repository root.
- The stronger signal ("evidence moved since the decision") needs a new,
  continuously maintained metadata field - the same maintenance cost that sank
  the index idea.

The product's model is "records are history, code is current", so a stale record
is retired by a human supersede, not monitored by a scanner. Rejected.

### 4. Verification and enforcement: deferred

Enforcement is the peers' core value, but it changes the product from a record
manager into a linter, needs a rule DSL and diff handling, and many
architectural decisions are not machine-checkable (the peer's own README admits
this). Deferred until repeated evidence shows a recorded decision was ignored. A
lightweight `verified_in` pointer would be the first step if it is taken.

### 5. Implicit-decision discovery produces a prompt, not records

The right shape is a read-only scan that produces an agent prompt or candidate
topic list, never records: a decision needs the rejected alternatives, which
code cannot reveal. At most a `skills/adrkit-init` addition.

### 6. Agent contract: a read-only vs mutating command table

The peer's agent brief opens with a table marking every tool read-only or
mutating and flagging human-gated steps. This product can add the same small
table to `AGENTS.md` / the skills. No new behavior.

### 7. Dangling-reference check: accepted

`adrkit graph` mines `ADR-N`/`ADR N` references from bodies
(`src/core/graph.ts:37`) and keeps only those that resolve to a node
(`graph.ts:93`), so a reference to a missing decision is silently dropped;
`validate` checks only `superseded-by` in front matter (`validate.ts:294`).
Verified: a record body naming `ADR-99` passes `adrkit validate --all` and
produces no graph edge or warning. The regret of a permanent dead link in an
immutable record outweighs the ~20-line cost. Opened as the change
`add-dangling-reference-check`.

## Non-goals (explicitly rejected)

- **MCP server, hooks, in-flight injection** - need a long-running process and
  client event surfaces.
- **Selectable formats (MADR / Nygard / canonical)** - the format is the product
  and is machine-checked.
- **LLM judges** - the trust model is deterministic declarations and validation.
- **ESLint / Ruff rule generation** - couples the tool to two language
  ecosystems.
- **Generated index and retrieval metadata** (`topics`/`aliases`/
  `components`/`symbols`) - derived and maintained; front matter suffices.
- **`status_history` in the body** - git is the history.
- **Symmetric `related`** - duplicates what `graph` mines.
- **`deciders` array** - `decided-by` is deliberately single-axis.

## Decisions

- Capture the landscape as a documentation change (`skip_specs: true`); the
  accepted feature (#7) is its own change.
- Keep the product record-model-first: no enforcement, retrieval, or service.

## Risks / Trade-offs

- [Peer capabilities may be less mature than the READMEs claim] -> the document
  cites code paths and tested behavior, not marketing.
- [Feature envy] -> the non-goals are explicit and each survivor is small.
