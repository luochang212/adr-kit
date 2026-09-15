---
name: adrkit-decide
description: Use when recording a decision that is already accepted and does not need a proposal phase.
---

# ADR Kit Decide

## Overview

Record an already-made decision directly in `adr/decisions/` with the next
`N` number.

## Steps

1. Run:

```bash
adrkit decide "<title>"
```

2. Edit the created file and fill `## Problem`, `## Decision`,
   `## Alternatives considered`, and `## Consequences`. Add 2-4 kebab-case
   `tags` to the front matter (for example `frontend`, `execution-layer`)
   so the decision graph can group by theme.
3. Run `adrkit validate <N>` until it returns OK.

## Rules

- Accepted decisions must not contain `## Proposal`, `## Acceptance
  criteria`, or `## Risks` sections.
- Never edit the `decided-by` field: the CLI stamps it from the environment
  the command runs in. Hand-editing it is a false provenance claim, and
  `adrkit validate` reports the field as missing on records that predate it -
  say so and let the human supply the value rather than inventing one.
- `adrkit accept` is the better path when a proposal already exists.
