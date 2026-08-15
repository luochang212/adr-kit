---
name: openadr-propose
description: Use when starting a new architecture decision that still needs review before it is accepted.
---

# OpenADR Propose

## Overview

Create a proposed ADR in `adr/proposed/`. The proposal is a draft and is
expected to fail `openadr validate` until every required section is filled.

## Steps

1. Run:

```bash
openadr propose "<title>"
```

2. Edit the created file. Fill every section with real content:
   `## Problem`, `## Proposal`, `## Alternatives considered`,
   `## Acceptance criteria`, `## Risks`.
3. Run `openadr validate` until it returns OK.

## Rules

- Do not skip `## Alternatives considered`. A proposal without alternatives
  is invalid by design.
- Keep the status line exactly `Status: proposed`.
