---
name: adrkit-propose
description: Use when starting a new architecture decision that still needs review before it is accepted.
---

# ADR Kit Propose

## Overview

Create an ephemeral proposal draft in `adr/.drafts/`. A draft is temporary:
`adrkit accept` promotes it into a decision, `adrkit reject` discards it
without leaving a record.

## When to record

Use this workflow for architectural choices that constrain future development
and whose rationale is not apparent from code alone. Routine implementation
details, local fixes, and easily reversible choices need no ADR. Do not create
an ADR for every task or invent alternatives and reasons to fill a template.

## Steps

1. Run `adrkit list` and read every decision in full with `adrkit show <N>`
   (or read its file), even if you ran it earlier in this conversation.
   Check whether this decision supersedes or overlaps an existing one against
   current code and requirements. Treat superseded records as history and
   pending drafts as unaccepted proposals. Reuse an existing decision when
   it already captures the same choice; explain changed assumptions when
   replacing one, and use `adrkit supersede` after its replacement is recorded
   and validated.
2. Run:

```bash
adrkit propose "<title>"
```

3. Edit the created draft. Fill every section with real content:
   `## Problem`, `## Proposal`, `## Alternatives considered`,
   `## Acceptance criteria`, `## Risks`.
4. Add 2-4 kebab-case `tags` to the front matter (for example `frontend`,
   `execution-layer`) so the decision graph can group by theme.
5. Promote the completed draft with `adrkit accept "<title>"`; the CLI
   validates it before promoting.

## Rules

- Do not skip `## Alternatives considered`. A proposal without alternatives
  is invalid by design.
- Keep the front matter exactly `status: proposed`. Never write
  `decided-by`: the CLI stamps it at promotion from the environment that
  promotes the draft, and a hand-written value is rejected while the draft
  exists and dropped when it is promoted.
