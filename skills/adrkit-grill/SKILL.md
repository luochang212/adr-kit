---
name: adrkit-grill
description: Use when a decision is still being shaped and its direction is not settled, in a repository with an adr/ directory, or on any 'grill' trigger phrase; grill the user to shared understanding and record every decision the session settles. Also use when the user asks to visualize an existing ADR or grilling decision.
---

# ADR Kit Grill

## Overview

Interrogate the user about a decision until nothing is left silently
assumed, then record every decision the session settled. The session feeds the
record directly: the root questions become `## Problem`, the rejected options
become `## Alternatives considered`, and who raised and who overrode feeds
`raised-by` and `decided-by`.

The interrogation method is adapted from the `grilling` skill in
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT).

## Visualize an existing decision

When the user asks to visualize a recorded ADR or grilling decision, use this
path directly; do not start a new grilling session or create another ADR.

1. Resolve the requested record with `adrkit list` and `adrkit show <N>`.
   Read its `## Deliberation` appendix. If there is no tree, explain that the
   record has no recorded deliberation to visualize; do not invent one.
2. Use the built-in renderer, not an agent-designed replacement page:
   `adrkit tree <N> --html > "<output-path>.html"`. Choose a new file in the
   user's requested location or a temporary directory; quote paths and avoid
   overwriting a record or an existing file. Check the command succeeded.
3. Deliver a clickable link to the generated HTML file. It contains its own
   styles and interaction code and works offline. Open a browser only when the
   user explicitly asks to open it. No browser launch is part of generation.

Generate HTML only on an explicit visualization request, never automatically
at the end of a grilling session. `--text` and `--mermaid` remain available
when the user requests those formats. Keep Markdown as the source of truth.

## When to grill

Grill when a decision is still being shaped and its direction is not settled:
an architectural choice, or any other decision worth stress-testing before it
is recorded. The direct `decide`/`propose` paths keep the ADR importance bar;
a grilling session is itself the signal that its output is key, so its
decisions are not filtered again at record time.

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
   round belongs to a later round. As each answer settles, note which option
   or question raised the next one; the record nests it under that node.
5. Finding facts is your job, never the user's: when a question needs a fact
   from the repository or the environment, look it up yourself (or dispatch
   a sub-agent) instead of asking. Do not block on a running lookup; only
   the questions downstream of it wait. The decisions are the user's: put
   each to them and wait.
6. The session is done when the frontier is empty: every branch visited,
   nothing left silently assumed. Do not act and do not write records until
   the user confirms you have reached shared understanding.

## Recording the outcome

1. Record every decision the session settled; there is no record-time filter.
   One session often settles several decisions: usually one primary record
   with the rest as branches, but split them when they can be superseded
   independently. Run `adrkit decide "<title>" --raised-by human
   --decided-by human` (or `agent` on either axis, per the rule below);
   grilling ends in a decision, never a proposal. Then follow the decide
   workflow.
2. Fill the record from the session: `## Problem` from the root questions,
   `## Decision` from the user's answers, `## Alternatives considered` from
   the frontier options they rejected, `## Consequences` from the branches
   their answers unlocked. Keep the design tree in an optional
   `## Deliberation` appendix: prefix a question `Q:` and an option `A:`, tag
   each node `[settled]`, `[rejected]`, or `[open]`, nest each follow-up
   question under the option or question that raised it, mark the option you
   recommended `(recommended)`, and give a rejected option a ` — reason`.
   `adrkit tree <N>` renders it (`--mermaid`, or `--html` for a file). Add 2-4
   kebab-case `tags` to the front matter.
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
  of shared understanding, and then every decision the session settled is
  recorded.
- A settled decision the user reopens becomes a supersede once its
  replacement is recorded and validated: use `adrkit supersede`, and say in
  the new record's `## Problem` what assumption changed.
