---
status: accepted
date: 2026-09-20
raised-by: agent
decided-by: human
created: 2026-09-20
commit: ba15e73
tags: [governance, dogfooding, process]
---

# ADR: 2 dogfood adr records in this repository

## Problem

The repository ignored `adr/` and governed itself with OpenSpec alone, on the
theory that a durable, immutable decision log would block the breaking record
format changes the tool still needs to make. That left an inconsistency: ADR 1
was accepted locally but could never be committed, so the decision was
invisible to CI, fresh clones, and every other agent — while the task-start
rule in `AGENTS.md` tells agents to read `adr/` decisions. An accepted record
only one machine can see is not a record.

## Decision

This repository dogfoods its own records. `adr/` is tracked: the root
`.gitignore` no longer ignores it, `adr/.gitignore` still keeps the ephemeral
`adr/.drafts/` out of version control, and ADR 1 is committed rather than left
local-only. Future changes are recorded in `adr/` first, so the `AGENTS.md`
reading rule applies for real. OpenSpec remains for the spec-driven work it
already governs; the two are complementary, not exclusive.

## Alternatives considered

- **Keep ignoring `adr/` (OpenSpec only)**: rejected. It keeps a governance
  log nobody else can read and makes the `AGENTS.md` reading rule vacuous
  here. The cost it feared — migrating self-records across breaking format
  changes — is real but bounded, and a tool that will not eat its own dog food
  is weaker evidence for adopters.
- **Keep `adr/` local and delete the reading rule**: rejected. It resolves the
  contradiction by discarding the half of the pipeline that makes the product
  worth adopting: an accepted decision would still have no durable home.
- **Record this shift as an OpenSpec change**: rejected. The choice is about
  where decisions live, which is what an ADR records; using the other mechanism
  to decide to stop using it for this would obscure the point.

## Consequences

- The root `.gitignore` drops the `adr/` rule and its OpenSpec-only rationale;
  drafts stay ignored through `adr/.gitignore`.
- Breaking changes to the record format now require migrating this repository's
  own records, not just the tool's templates and tests.
- `adr/decisions/1-…md` and `2-…md` become committed history; CI and every
  clone see the same decisions the maintainer sees.
- `adrkit validate` is now a real gate on this repository's own changes.
