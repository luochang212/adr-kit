---
name: adrkit-grill
description: Use when an important architectural choice is under discussion and the direction is not yet settled; grill the user to shared understanding before recording, or on any 'grill' trigger phrase.
---

# ADR Kit Grill

## Overview

Interrogate the user about an architectural decision until nothing is left
silently assumed, then record the settled decision. The session feeds the
record directly: the root questions become `## Problem`, the rejected options
become `## Alternatives considered`, and who raised and who overrode feeds
`raised-by` and `decided-by`.

The interrogation method is adapted from the `grilling` skill in
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

## When to grill

Use this workflow for architectural choices that constrain future development
and whose rationale is not apparent from code alone, while the direction is
still being shaped. Routine implementation details, local fixes, and easily
reversible choices need neither grilling nor an ADR. Do not grill every task
to manufacture content for a record.

## Method

1. Run `adrkit list` and read every decision in full with `adrkit show <N>`
   (or read its file), even if you ran it earlier in this conversation. The
   tree must not re-ask what an existing record already settles; reopening a
   settled decision is a supersede, not a question.
2. Map the decision as a design tree: every decision branches into the
   decisions that hang off it.
3. Work the tree in rounds. The frontier is every question whose
   prerequisites are already settled: the questions you can ask now without
   guessing at answers you have not heard. Ask the whole frontier in one
   round, then wait for the user's answers before the next round. Format
   each question like:

```
❓ **Q1 - <question title>**: <question body, with options if any>

➡️ <your recommended answer>
```

4. Each round of answers reshapes the tree: settled decisions push the
   frontier outward and unblock the questions that depended on them. A
   question whose answer depends on another question still open in this
   round belongs to a later round.
5. Finding facts is your job, never the user's: when a question needs a fact
   from the repository or the environment, look it up yourself (or dispatch
   a sub-agent) instead of asking. Do not block on a running lookup; only
   the questions downstream of it wait. The decisions are the user's: put
   each to them and wait.
6. The session is done when the frontier is empty: every branch visited,
   nothing left silently assumed. Do not act and do not write records until
   the user confirms you have reached shared understanding.

## Recording the outcome

1. Record only the settled decisions that clear the bar above; one session
   often settles several, and usually one primary record suffices. Run
   `adrkit decide "<title>" --raised-by human --decided-by human` (or
   `agent` on either axis, per the rule below); grilling ends in a decision,
   never a proposal. Then follow the decide workflow.
2. Fill the record from the session: `## Problem` from the root questions,
   `## Decision` from the user's answers, `## Alternatives considered` from
   the frontier options they rejected, `## Consequences` from the branches
   their answers unlocked. Keep the design tree in an optional
   `## Deliberation` appendix as a nested list, marking each node `[settled]`,
   `[rejected]`, or `[open]`; `adrkit tree <N>` renders it. Add 2-4 kebab-case
   `tags` to the front matter.
3. Declare both provenance axes: `--raised-by` is who put the decision on the
   table; `--decided-by` is whose judgment settled it. `decided-by` is `human`
   when the user's answers determined the direction — especially where they
   overrode your recommendations — and `agent` when they adopted every
   recommendation without engaging. Put the nuance in the body: which
   recommendations they changed and which they let through.
4. Run `adrkit validate <N>` until it returns OK.

## Rules

- One round at a time: never stack a question whose answer depends on a
  question still open in the same round.
- Never ask the user for a fact you could look up yourself.
- Never write a record mid-session; records follow the user's confirmation
  of shared understanding, and only for decisions that clear the bar.
- A settled decision the user reopens becomes a supersede once its
  replacement is recorded and validated: use `adrkit supersede`, and say in
  the new record's `## Problem` what assumption changed.
