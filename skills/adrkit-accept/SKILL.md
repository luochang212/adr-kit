---
name: adrkit-accept
description: Use when a proposed ADR is complete and validated, and the team has decided to accept it.
---

# ADR Kit Accept

## Overview

Accept a proposal. The CLI validates the proposal, assigns the next
`N` decision number, rewrites `## Proposal` to `## Decision`, folds
`Acceptance criteria` and `Risks` into `## Consequences`, and moves the
file from `adr/proposed/` to `adr/decisions/`.

## Steps

1. Run `adrkit validate` and confirm the proposal is OK.
2. Run:

```bash
adrkit accept "<name>"
```

3. Confirm the output names the new `adr/decisions/N-*.md` file.

## Rules

- Never accept an invalid proposal; the command refuses.
- Re-run `adrkit validate` immediately before accepting, even if you
  validated earlier in this conversation; the repo may have changed since.
- Review the generated `## Consequences` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example `## Plan`); save their content elsewhere
  if it still matters.
