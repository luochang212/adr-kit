# CLI reference

Run from anywhere inside a project; ADR Kit discovers the nearest `adr/`.
Records live in `proposed/`, `implemented/`, `rejected/`, and `archived/`.

| Command | Purpose |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | Create four lifecycle directories, config, archive manifest, README, and integrations |
| `adrkit propose <title>` | Create dated, unnumbered unshipped proposal |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | Promote a shipped proposal; assign stable ADR number |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | Record an already-shipped choice |
| `adrkit reject <name> --reason <text>` | Retain a declined proposal in `rejected/` |
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
