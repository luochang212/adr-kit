---
name: adrkit-accept
description: Use when a proposal draft is complete, and the team has decided to accept it.
---

# ADR Kit Accept

## Overview

Promote a completed draft to a decision. The CLI validates the draft, assigns
the next `N` number, rewrites `## Proposal` to `## Decision`, folds
`Acceptance criteria` and `Risks` into `## Consequences`, writes
`adr/decisions/N-*.md`, and discards the draft from `adr/.drafts/`.

## Steps

1. Review the draft with `adrkit show "<name>"`; every section must have real
   content before accepting.
2. Run:

```bash
adrkit accept "<name>" --raised-by human --decided-by human   # or agent on either axis
```

3. Confirm the output names the new `adr/decisions/N-*.md` file.

## Rules

- Declare `raised-by` and `decided-by` when you promote: `raised-by` is who
  put the draft on the table, `decided-by` whose judgment settled it. For
  `decided-by`, `human` means a person determined the direction (they stated
  it, changed this draft into what shipped, or you are recording one they made
  earlier), `agent` means it came from your own judgment, including when a
  person only let the draft through. Promotion is the last moment either value
  can be set; the CLI records what you declare without inferring or checking
  it. If the person redirected or approved your proposal, say so in the body.
- Never accept an invalid draft; the command refuses.
- Re-run `adrkit show "<name>"` immediately before accepting, even if you
  reviewed it earlier in this conversation; the repo may have changed since.
- `accepted` means a recorded decision, not proof of human review.
- Review the generated `## Consequences` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example `## Plan`); save their content elsewhere
  if it still matters.
