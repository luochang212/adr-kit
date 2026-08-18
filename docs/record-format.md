# Record Format

Every ADR is plain Markdown. The first four lines are fixed:

```markdown
# ADR: <title>
Status: proposed | accepted | rejected — <reason> | superseded by N
Date: YYYY-MM-DD
```

No front matter. No special syntax.

The `Date:` line records when the current status was reached. The CLI
stamps it at every lifecycle move (`propose`, `decide`, `accept`,
`reject`, `supersede`), so it is machine-written, never hand-maintained.

## Proposed records

File name: `YYYY-MM-DD-slug.md`. Required sections:

```markdown
## Problem
## Proposal
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Alternatives considered` must contain at least one written alternative
after HTML comments are stripped.

## Accepted decisions

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
decision number on the status line:

```markdown
Status: superseded by 6
```

`validate` checks that the referenced number exists and is not itself
superseded. Superseded records stay in `adr/decisions/` as frozen history.

## Rejected proposals

File name: `YYYY-MM-DD-slug.md`. The status line carries the reason:

```markdown
Status: rejected — we chose JSON files instead
```

Required sections: `Problem`, `Proposal`, `Alternatives considered`.
Rejected records are frozen history.

## Slug rules

Slugs keep ASCII letters, digits, and CJK characters. Everything else
becomes a dash. The result is capped at 80 characters.
