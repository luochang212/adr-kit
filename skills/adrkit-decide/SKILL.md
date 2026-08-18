---
name: adrkit-decide
description: Use when recording a decision that is already accepted and does not need a proposal phase.
---

# ADR Kit Decide

## Overview

Create an accepted decision draft directly in `adr/decisions/` with the
next `NNNN` number.

## Steps

1. Run:

```bash
adrkit decide "<title>"
```

2. Edit the created file and fill `## Problem`, `## Decision`,
   `## Alternatives considered`, and `## Consequences`.
3. Run `adrkit validate <NNNN>` until it returns OK.

## Rules

- Accepted decisions must not contain `## Proposal`, `## Acceptance
  criteria`, or `## Risks` sections.
- `adrkit accept` is the better path when a proposal already exists.
