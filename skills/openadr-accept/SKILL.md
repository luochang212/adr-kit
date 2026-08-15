---
name: openadr-accept
description: Use when a proposed ADR is complete and validated, and the team has decided to accept it.
---

# OpenADR Accept

## Overview

Accept a proposal. The CLI validates the proposal, assigns the next
`NNNN` decision number, rewrites `## Proposal` to `## Decision`, folds
`Acceptance criteria` and `Risks` into `## Consequences`, and moves the
file from `adr/proposed/` to `adr/decisions/`.

## Steps

1. Run `openadr validate` and confirm the proposal is OK.
2. Run:

```bash
openadr accept "<name>"
```

3. Confirm the output names the new `adr/decisions/NNNN-*.md` file.

## Rules

- Never accept an invalid proposal; the command refuses.
- Review the generated `## Consequences` after accepting.
