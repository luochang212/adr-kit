# Workflow

## Proposal first

```text
openadr init
openadr propose "Use SQLite for session storage"
# fill in the draft
openadr validate
openadr accept "Use SQLite for session storage"
```

`openadr accept` performs the mechanical rewrite a lifecycle move always
owed:

- `## Proposal` becomes `## Decision`
- `Acceptance criteria` and `Risks` are folded into `## Consequences`
- the file moves from `adr/proposed/` to `adr/decisions/NNNN-slug.md`

## Rejection

```text
openadr reject "Use SQLite for session storage" --reason "we chose files"
```

The proposal is frozen in `adr/rejected/` with the reason on the status
line.

## Recording an already-made decision

```text
openadr decide "Use SQLite for session storage"
# fill in the draft
openadr validate 0001
```

## Agent workflow

Agents can drive the same lifecycle through JSON output:

```bash
openadr status --json
openadr instructions --json
openadr validate --json
```
