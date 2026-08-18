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

### `adrkit init [path] [--tools <list>]`

Create an `adr/` repository in `path` (default: current directory). Pass
`--tools <list>` to also write AI agent command files and skills (for
example `claude`, `codex`, `all`, or `none`; see `adrkit update`).

```text
adr/
├── config.yaml
├── README.md
├── decisions/
├── proposed/
└── rejected/
```

### `adrkit propose <title>`

Create a proposed ADR in `adr/proposed/YYYY-MM-DD-slug.md`. The draft is
expected to fail `validate` until every required section is filled in.

### `adrkit decide <title>`

Create an accepted decision draft in `adr/decisions/N-slug.md` with the
next available number.

### `adrkit accept <name>`

Validate a proposal, assign the next `N` number, rewrite the lifecycle
sections, and move the file from `adr/proposed/` to `adr/decisions/`.

### `adrkit reject <name> --reason <text>`

Move a proposal to `adr/rejected/` with the reason recorded on the status
line.

### `adrkit supersede <name> --by <name>`

Mark an accepted decision as superseded by a newer accepted decision. The
status line of the old record becomes `Status: superseded by N`; the file
stays in `adr/decisions/` as history. `--by` must resolve to an existing
accepted decision that is not itself superseded.

### `adrkit list [--json]`

List every record grouped by lifecycle folder.

### `adrkit show <name>`

Print a record. `name` resolves by title, file name, or decision number.

### `adrkit status [--json]`

Print lifecycle counts and repository validity.

### `adrkit instructions [--json]`

Print the next workflow step (init, fix validation, decide, or propose). When
proposals are waiting, each one is flagged as validated (ready to accept) or
needs work, so the next action is executable rather than a direction. In
`--json` mode the readiness is exposed as `readyToAccept` and `needsWork`
next to the `pending` list.

### `adrkit validate [name] [--all] [--json]`

Validate one record, or the whole repository when `name` is omitted or
`--all` is given.

### `adrkit update [--tools <list>]`

Write AI tool integrations into the project: agent skills (`.claude/skills/`,
`.codex/skills/`, …) alongside slash-command files (`.claude/commands/`,
`.codex/commands/`, …). Without `--tools`, the tools recorded at `init`
time are used. Integrations for tools no longer selected are removed.

### `adrkit config [--json]`

Print the current `adr/config.yaml` configuration.

### `adrkit completion <bash|zsh|fish>`

Print a shell completion script for the given shell.

### `adrkit version`

Print the version.
