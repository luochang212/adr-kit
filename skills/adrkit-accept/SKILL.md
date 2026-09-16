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
adrkit accept "<name>" --decided-by human   # or agent, per the rule below
```

3. Confirm the output names the new `adr/decisions/N-*.md` file.

## Rules

- Declare `decided-by` when you promote: `human` when a person determined the
  direction (they stated it, changed this draft into what shipped, or you are
  recording one they made earlier), `agent` when it came from your own
  judgment, including when a person only let the draft through. Promotion is
  the last moment the value can be set; the CLI records what you declare
  without inferring or checking it. If the person redirected or approved your
  proposal, say so in the body.
- Never accept an invalid draft; the command refuses.
- Re-run `adrkit show "<name>"` immediately before accepting, even if you
  reviewed it earlier in this conversation; the repo may have changed since.
- `accepted` means a recorded decision, not proof of human review.
- Review the generated `## Consequences` after accepting.
- The command warns when a proposal contains sections that have no place in
  an accepted decision (for example `## Plan`); save their content elsewhere
  if it still matters.
