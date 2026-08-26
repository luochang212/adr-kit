# CLI Reference

Run from anywhere inside a project; commands discover the nearest `adr/`
directory by walking upward.

## Global options

| Option | Description |
| --- | --- |
| `-h, --help` | Print help (`adrkit help` does the same) |
| `-V, --version` | Print the version |

The agent-facing commands (`list`, `status`, `instructions`, `validate`,
`config`) accept `--json` for machine-readable output; other commands reject
the flag instead of silently ignoring it.

## Commands

### `adrkit init [path] [--tools <list>]`

Create an `adr/` repository in `path` (default: current directory) and
install the agent integration into `.agents/` (`commands/` + `skills/`) -
the vendor-neutral convention every mainstream agent reads. `--tools claude`
additionally installs `.claude/` copies for Claude Code (the one agent that
does not read `.agents/`); `--tools none` installs nothing.

```text
adr/
├── config.yaml
├── README.md
├── .gitignore     # keeps adr/.drafts/ out of git
└── decisions/
```

Proposals are ephemeral drafts in `adr/.drafts/`; the directory is created
on the first `adrkit propose`.

### `adrkit decide <title>`

Record an already-made decision in `adr/decisions/N-slug.md` with the
next available number. This is the default path. Titles must not start with
a number.

### `adrkit propose <title>`

Create an ephemeral proposal draft in `adr/.drafts/YYYY-MM-DD-slug.md`. A
draft is temporary: `accept` promotes it to a numbered decision, `reject`
discards it without leaving a record. Titles must not start with a number.

### `adrkit accept <name>`

Validate a draft, assign the next `N` number, rewrite the lifecycle
sections, write `adr/decisions/N-slug.md`, and discard the draft.
The draft's title must not start with a number.

### `adrkit reject <name> [--reason <text>]`

Discard a proposal draft from `adr/.drafts/`. No record is created -
rejection lives in the winning decision's `Alternatives considered`. The
`--reason` is optional and only echoed.

### `adrkit supersede <name> --by <name>`

Mark an accepted decision as superseded by a newer accepted decision. The
old record's front matter becomes `status: superseded` with
`superseded-by: N` and its `date` field is stamped with the supersede
date; the file stays in
`adr/decisions/` as history. `--by` must resolve to an existing accepted
decision that is not itself superseded.

### `adrkit list [--json]`

List decisions (accepted and superseded) and any pending drafts.

### `adrkit show <name>`

Print a decision or draft. `name` resolves by title, file name, or decision
number. A record that fails to parse elsewhere in the repository does not
block `show`; `adrkit validate` still reports it.

### `adrkit status [--json]`

Print lifecycle counts (accepted, superseded, pending drafts) and
repository validity.

### `adrkit instructions [--json]`

Print the next workflow step (init, fix validation, decide, or propose). When
drafts are pending, each one is flagged as validated (ready to accept) or
needs work, so the next action is executable rather than a direction. In
`--json` mode the readiness is exposed as `readyToAccept` and `needsWork`
next to the `pending` list.

### `adrkit validate [name] [--all] [--json]`

Validate one record, or the whole repository when `name` is omitted or
`--all` is given. Single-record validation also checks that a
`superseded-by: N` reference points at an existing decision that is not
itself superseded.

### `adrkit update [--tools <list>]`

Rewrite the agent integrations: the standard `.agents/` target plus, with
`--tools claude`, the `.claude/` exception. Targets that are no longer
selected are removed. Without `--tools`, the targets recorded in
`adr/config.yaml` are used.

### `adrkit config [--json]`

Print the current `adr/config.yaml` configuration.

### `adrkit graph [--mermaid|--dot|--json] [--formal-only]`

Emit a relationship graph of the decisions: solid edges for formal
`superseded-by` references, dashed edges for `ADR-N` mentions mined from
record bodies, grouped by date so decision bursts are visible without
implying a continuous timeline. `--mermaid` (the default) renders natively
on GitHub; `--dot` emits Graphviz; `--json` exposes the graph for other
tools. `--formal-only` drops the mined edges. Note that `date` records the
current status date, not the creation date.

### `adrkit completion <bash|zsh|fish>`

Print a shell completion script for the given shell.

### `adrkit version`

Print the version.
