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
rewritten; the body is frozen history. `validate` checks that the
referenced number exists and is not itself superseded, so a chain always
ends at a currently-accepted decision.

## Agent workflow

Agents can drive the same lifecycle through JSON output:

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
