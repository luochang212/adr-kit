# Workflow

## The default path: record a decision

```text
adrkit init
adrkit decide "Use SQLite for session storage"
# fill in the decision
adrkit validate
```

Decisions are durable records in `adr/decisions/N-slug.md`. Recording one is
the default action; deliberation happens before the command, not in a file.

## Proposals: ephemeral drafts

When a decision still needs review, create a draft instead:

```text
adrkit propose "Use SQLite for session storage"
# fill in the draft
adrkit accept "Use SQLite for session storage"
```

`adrkit accept` validates the draft and performs the mechanical rewrite a
lifecycle move always owed:

- `## Proposal` becomes `## Decision`
- `Acceptance criteria` and `Risks` are folded into `## Consequences`
- the draft is promoted to `adr/decisions/N-slug.md` and deleted

A draft that does not become a decision is discarded:

```text
adrkit reject "Use SQLite for session storage" [--reason "we chose files"]
```

`reject` deletes the draft and leaves no record. Rejection lives in the
winning decision's `Alternatives considered`, not in a standalone record.

## Superseding an accepted decision

Decisions get overturned. Record the replacement first, then retire the
outdated record:

```text
adrkit decide "Use Postgres for session storage"
# fill in the new decision, validate it
adrkit supersede 1 --by 2
```

The old record stays in `adr/decisions/` with `status: superseded` and
`superseded-by: 2` in its front matter. Only the front matter is
rewritten; the body is frozen history. The record's `decided-by` value is
preserved rather than re-stamped: the field answers who made the decision,
not which environment ran the retirement. `validate` checks that the
referenced number exists and is not itself superseded, so a chain always
ends at a currently-accepted decision.

## Read decisions before coding

ADR sets are usually small. At the start of a coding, design, or review task,
read the existing decisions before making choices. Add the following section
to the project's `AGENTS.md`, and also `CLAUDE.md` when that is the team's
entry point. Preserve existing instructions; merge an equivalent section
instead of duplicating it. The init skill guides the agent through this step;
the CLI's `init` / `update` installs workflow files without editing project
instructions. For an existing project, run `adrkit update` to refresh skills
and add this section too.

```markdown
## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run
`adrkit list` and read every decision in full with `adrkit show <N>` (or read
its file). ADR sets are small; do not filter by title alone. Treat accepted
records as decision context, superseded records as history, and pending
drafts as unaccepted proposals. Check relevant decisions against current
code and the task's requirements. Apply the constraints that still hold;
explain conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.
```

## Agent workflow

Agents can drive the same lifecycle through JSON output:

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
