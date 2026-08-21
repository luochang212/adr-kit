# Record Format

Every ADR is YAML front matter followed by a Markdown body:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
commit: abc1234
---

# ADR: N <title>
```

Front matter fields are written in the order `status`, `date`, `commit`,
`superseded-by`; only the fields that apply are present. `commit` is the
short git hash the decision was recorded against, stamped automatically when
the repository is under git. `superseded-by` is required on superseded
decisions and forbidden otherwise. Unknown fields are reported by `validate`.

The `date` field records when the current status was reached. The CLI
stamps it at every lifecycle move (`decide`, `accept`, `supersede`), so it
is machine-written, never hand-maintained.

## Drafts (proposals)

File name: `YYYY-MM-DD-slug.md`, location `adr/.drafts/`. Front matter:
`status: proposed`. Required sections:

```markdown
## Problem
## Proposal
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Alternatives considered` must contain at least one written alternative
after HTML comments are stripped.

Drafts are ephemeral and outside the `validate` surface: `adrkit accept`
validates a draft right before promoting it into a decision, and `adrkit
reject` discards it without leaving a record.

## Decisions

File name: `N-slug.md`. Title: `# ADR: N <title>`. Required sections:

```markdown
## Problem
## Decision
## Alternatives considered
## Consequences
```

Proposal-era sections (`Proposal`, `Acceptance criteria`, `Risks`, `Plan`,
`Migration plan`) are rejected in accepted decisions.

Superseded decisions keep the accepted shape but carry the replacing
decision number in the front matter:

```markdown
---
status: superseded
date: 2026-08-19
superseded-by: 6
---
```

`validate` checks that the referenced number exists and is not itself
superseded. Superseded records stay in `adr/decisions/` as frozen history.

## Rejection

A rejected idea is not a standalone record. Every decision's
`Alternatives considered` documents what was considered and why it lost, so
a "no" never disappears and is never re-litigated.

## Slug rules

Slugs keep ASCII letters, digits, and CJK characters. Everything else
becomes a dash. The result is capped at 80 characters.
