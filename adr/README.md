# Architecture Decision Records

This directory is an ADR Kit repository. Each record is plain Markdown with a
machine-checkable header. Decisions are durable; proposals are ephemeral drafts.

## Folders

| Folder | Meaning |
| --- | --- |
| `decisions/` | Decisions, numbered sequentially, immutable history (accepted or superseded) |
| `.drafts/` | Proposal drafts, gitignored and ephemeral - promote one with `adrkit accept` or discard it with `adrkit reject` |

Never delete or modify a decision: retire one with `adrkit supersede` instead.
Deleting reuses its number, which silently breaks every `ADR-N` reference to it.

Rejection is recorded in a decision's `Alternatives considered` section, never
as a standalone record.

## Record format

Every record starts with a YAML front matter block:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
raised-by: human | agent
decided-by: human | agent
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

Decisions use `# ADR: N <title>` and require `Problem`, `Decision`,
`Alternatives considered`, and `Consequences`. Superseded decisions add
`superseded-by: N`. The `date` field records when the current status was
reached; the CLI stamps it at every lifecycle move, alongside the git `commit`
the decision was recorded against. `created` is the birth date, stamped once
and never re-stamped, so the time axis survives later lifecycle moves. The
`raised-by` records who put the decision on the table and `decided-by` records
whose judgment settled it: `human` when a person determined the direction —
they stated it, changed a proposal into what shipped, or you are recording one
they made earlier — `agent` when it came from the agent's own judgment,
including when a person only let it through. The two are independent: a person
may raise what the agent settles, and the agent may raise what a person
settles. `decide` and `accept` require the caller to declare both with
`--raised-by` and `--decided-by`, and the CLI neither infers nor verifies
either, so neither establishes who chose or authorized the decision. The CLI
writes them at those moves and preserves them when a decision is superseded.
When the writer cannot tell which value applies, ask the person before recording
rather than guessing. The record body is where the nuance lives: when an agent
proposed and a person redirected or approved the result, say so in
`## Decision` rather than trying to split the field.
Likewise, `accepted` means a recorded decision, not proof of human review.
Commit identity stays in git. Optional `tags` (kebab-case keywords) let
`adrkit graph` group and filter decisions by theme. Drafts (`adr/.drafts/`,
`status: proposed`) require `Problem`, `Proposal`, `Alternatives considered`,
`Acceptance criteria`, and `Risks`, and carry neither `raised-by` nor
`decided-by`; `adrkit accept`
promotes one into a decision, and `adrkit reject` discards it without leaving
a record.

A decision may also carry an optional `## Deliberation` appendix: the design
tree behind the choice, stored as a nested Markdown list whose nodes may be
tagged `[settled]`, `[rejected]`, or `[open]`. Render it with
`adrkit tree <name>` (text by default, `--mermaid` for a graph).

Run `adrkit validate` to check every record.
