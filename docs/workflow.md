# Workflow

## Proposal first

```text
adrkit init
adrkit propose "Use SQLite for session storage"
# fill in the draft
adrkit validate
adrkit accept "Use SQLite for session storage"
```

`adrkit accept` performs the mechanical rewrite a lifecycle move always
owed:

- `## Proposal` becomes `## Decision`
- `Acceptance criteria` and `Risks` are folded into `## Consequences`
- the file moves from `adr/proposed/` to `adr/decisions/NNNN-slug.md`

## Rejection

```text
adrkit reject "Use SQLite for session storage" --reason "we chose files"
```

The proposal is frozen in `adr/rejected/` with the reason on the status
line.

## Superseding an accepted decision

Decisions get overturned. Record the replacement first, then retire the
outdated record:

```text
adrkit decide "Use Postgres for session storage"
# fill in the new decision, validate it
adrkit supersede 0001 --by 0002
```

The old record stays in `adr/decisions/` with `Status: superseded by 0002`
on the status line. Only the status line is rewritten; the body is frozen
history. `validate` checks that the referenced number exists and is not
itself superseded, so a chain always ends at a currently-accepted decision.

## Recording an already-made decision

```text
adrkit decide "Use SQLite for session storage"
# fill in the draft
adrkit validate 0001
```

## Agent workflow

Agents can drive the same lifecycle through JSON output:

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
