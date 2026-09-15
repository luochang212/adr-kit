---
name: adrkit-decide
description: Use when recording a decision that is already accepted and does not need a proposal phase.
---

# ADR Kit Decide

## Overview

Record an already-made decision directly in `adr/decisions/` with the next
`N` number.

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
adrkit decide "<title>"
```

3. Edit the created file and fill `## Problem`, `## Decision`,
   `## Alternatives considered`, and `## Consequences`. Add 2-4 kebab-case
   `tags` to the front matter (for example `frontend`, `execution-layer`)
   so the decision graph can group by theme.
4. Run `adrkit validate <N>` until it returns OK.

## Rules

- Accepted decisions must not contain `## Proposal`, `## Acceptance
  criteria`, or `## Risks` sections.
- Never edit the `decided-by` field: the CLI stamps it from the environment
  the command runs in. Hand-editing it is a false provenance claim, and
  `adrkit validate` reports the field as missing on records that predate it -
  say so and let the human supply the value rather than inventing one.
- `adrkit accept` is the better path when a proposal already exists.
