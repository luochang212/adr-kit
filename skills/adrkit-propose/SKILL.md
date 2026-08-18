---
name: adrkit-propose
description: Use when starting a new architecture decision that still needs review before it is accepted.
---

# ADR Kit Propose

## Overview

Create a proposed ADR in `adr/proposed/`. The proposal is a draft and is
expected to fail `adrkit validate` until every required section is filled.

## Steps

1. Run:

```bash
adrkit propose "<title>"
```

2. Edit the created file. Fill every section with real content:
   `## Problem`, `## Proposal`, `## Alternatives considered`,
   `## Acceptance criteria`, `## Risks`.
3. Run `adrkit validate` until it returns OK.

## Rules

- Do not skip `## Alternatives considered`. A proposal without alternatives
  is invalid by design.
- Keep the status line exactly `Status: proposed`.
- Before proposing, run `adrkit list` and check whether this decision
  supersedes or overlaps an existing one; mention that in the record. Re-run
  it even if you ran it earlier in this conversation: session memory can be
  stale, and the repo may have changed.
