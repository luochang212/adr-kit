# CLI reference

Run from anywhere inside a project; ADR Kit discovers the nearest `adr/`.
Records live in `proposed/`, `implemented/`, `rejected/`, and `archived/`.

| Command | Purpose |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | Create four lifecycle directories, config, archive manifest, README, and integrations |
| `adrkit propose <title>` | Create dated, unnumbered unshipped proposal |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | Promote a shipped proposal; assign stable ADR number |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | Record an already-shipped choice |
| `adrkit reject <name> --reason <text>` | Record a declined proposal's anti-pattern in `rejected/` |
| `adrkit archive <name> --reason <text>` | Retire implemented guidance to `archived/` |
| `adrkit supersede <old> --by <new>` | Replace and archive a fully superseded implemented decision |
| `adrkit list` | List records grouped by lifecycle |
| `adrkit show <name>` | Show a record by title, filename, slug, or ADR number |
| `adrkit status` | Count lifecycle folders and report validity |
| `adrkit instructions` | Show pending proposals and the next valid action |
| `adrkit validate [name] [--all] [--base <git-ref>]` | Validate one record, the whole repository, or the archive's append-only history |
| `adrkit update [--tools <list>] [--workflows <list>]` | Refresh installed agent integrations |
| `adrkit config` | Show current config |
| `adrkit graph [--mermaid\|--dot\|--text\|--html] [--formal-only] [--tag <tag>] [--out <path>]` | Visualize numbered decision history |
| `adrkit tree <name> [--mermaid\|--text\|--html]` | Render a record's deliberation tree |
| `adrkit completion <bash\|zsh\|fish>` | Print shell completion |
| `adrkit version` | Print version |
| `adrkit help` | Print help |

`-h, --help` prints help; `-V, --version` prints the version. Unsupported
options fail rather than being ignored. `--raised-by` says who introduced
a shipped choice; `--decided-by` says whose judgment settled it. Both are
declarations, not CLI inferences. `--reason` is required for rejection and
archival. The CLI cannot verify that code shipped or another authoritative
owner exists. `--tools claude` adds `.claude/` copies alongside the default
`.agents/`; `--tools none` installs no integrations. `validate --base`
requires repository-wide validation — it is refused together with a
single-record query — and fails with an actionable error when the base ref or
its manifest is missing or cannot be read.

## Configuration type errors

Repository-wide validation checks known fields in `adr/config.yaml`: `context`
and `installed-with` must be strings; `tools` and `workflows` must be lists of
strings; `rules` must map group names to lists of strings. Present fields with
the wrong type, including `null`, fail validation. Optional fields may be absent,
and unknown keys remain accepted. Rule text is advisory; validation checks its
type, not whether the record follows it.

An unquoted colon followed by a space can make a rule item a YAML mapping:

```yaml
rules:
  proposal:
    - Keep it short
    - max: 500
```

`adrkit validate --all` fails naming `rules.proposal[1]` (indexes start at zero).
Quote the whole item as `- "max: 500"` to make it a string. `list` still discovers
records when config fields are mistyped; `status` and `instructions` report the
repository's validation issues, including when proposals are pending.

## Source removal after sealing

`archive` and `supersede` write the archived file and its manifest seal before
removing the implemented source. If source removal fails, the command exits
non-zero and reports that sealing completed but source removal failed, with
both file paths and the underlying error. Both copies remain; the operation
has not fully completed or rolled back. For supersession, the replacement stays
active.

Inspect both copies and verify the archived file against its manifest seal.
Preserve any unique source content outside the sealed archive before repairing
permissions and removing only the redundant implemented source. Do not edit the
archived file or manifest seal. Retrying by decision number is ambiguous while
both copies exist. After removing the confirmed duplicate, run
`adrkit validate --all` to verify recovery.
