# CLI Reference

Run from anywhere inside a project; commands discover the nearest `adr/`
directory by walking upward.

## Global options

| Option | Description |
| --- | --- |
| `-h, --help` | Print help |
| `-V, --version` | Print the version |

Agent-facing commands accept `--json` for machine-readable output.

## Commands

### `openadr init [path]`

Create an `adr/` repository in `path` (default: current directory).

```text
adr/
├── config.yaml
├── README.md
├── decisions/
├── proposed/
└── rejected/
```

### `openadr propose <title>`

Create a proposed ADR in `adr/proposed/YYYY-MM-DD-slug.md`. The draft is
expected to fail `validate` until every required section is filled in.

### `openadr decide <title>`

Create an accepted decision draft in `adr/decisions/NNNN-slug.md` with the
next available number.

### `openadr accept <name>`

Validate a proposal, assign the next `NNNN` number, rewrite the lifecycle
sections, and move the file from `adr/proposed/` to `adr/decisions/`.

### `openadr reject <name> --reason <text>`

Move a proposal to `adr/rejected/` with the reason recorded on the status
line.

### `openadr list [--json]`

List every record grouped by lifecycle folder.

### `openadr show <name>`

Print a record. `name` resolves by title, file name, or decision number.

### `openadr status [--json]`

Print lifecycle counts and repository validity.

### `openadr instructions [--json]`

Print the next workflow step (init, fix validation, decide, or propose).

### `openadr validate [name] [--all] [--json]`

Validate one record, or the whole repository when `name` is omitted or
`--all` is given.

### `openadr version`

Print the version.
