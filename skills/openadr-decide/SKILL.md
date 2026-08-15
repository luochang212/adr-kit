---
name: openadr-decide
description: Use when recording a decision that is already accepted and does not need a proposal phase.
---

# OpenADR Decide

## Overview

Create an accepted decision draft directly in `adr/decisions/` with the
next `NNNN` number.

## Steps

1. Run:

```bash
openadr decide "<title>"
```

2. Edit the created file and fill `## Problem`, `## Decision`,
   `## Alternatives considered`, and `## Consequences`.
3. Run `openadr validate <NNNN>` until it returns OK.

## Rules

- Accepted decisions must not contain `## Proposal`, `## Acceptance
  criteria`, or `## Risks` sections.
- `openadr accept` is the better path when a proposal already exists.
