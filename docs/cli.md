# CLI reference

Run from anywhere inside a project; ADR Kit discovers the nearest `adr/`.
Records live in `proposed/`, `implemented/`, `rejected/`, and `archived/`.
The npm package is `adr-kit`; the command it installs is `adrkit`.

| Command | Purpose |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | Create four lifecycle directories, config, README, and integrations |
| `adrkit propose <title>` | Create dated, unnumbered unshipped proposal |
| `adrkit note <text>` | Append a timestamped one-line decision note to `adr/notes.md`; outside the lifecycle, ignored by validation, counted by `list` and `instructions` |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | Promote a shipped proposal; assign stable ADR number |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | Record an already-shipped choice |
| `adrkit reject <name> --reason <text>` | Record a declined proposal's anti-pattern in `rejected/` |
| `adrkit archive <name> --reason <text>` | Retire implemented guidance to `archived/` |
| `adrkit supersede <old> --by <new>` | Replace and archive a fully superseded implemented decision |
| `adrkit list` | List records grouped by lifecycle |
| `adrkit relevant [<path>... | --base <git-ref> | --staged]` | Retrieve scoped records for explicit paths, an exact base-to-working-tree change, or staged files; input modes are exclusive |
| `adrkit show <name>` | Show a record by title, filename, slug, or ADR number |
| `adrkit status` | Count lifecycle folders and report validity |
| `adrkit instructions` | Show pending proposals and the next valid action |
| `adrkit validate [name] [--all]` | Validate one record or the whole repository, including its closed lifecycle inventory |
| `adrkit update [--tools <list>] [--workflows <list>]` | Refresh installed agent integrations |
| `adrkit config` | Show current config |
| `adrkit hook <install\|uninstall\|run>` | Install, remove, or run the managed pre-commit check: fail on invalid staged records and citations, then show which active decisions govern the staged files |
| `adrkit atlas [--out <path>] [--map] [--lang <en\|zh>] [--theme <folio\|signal\|random>] [--record <name>] [--format <mermaid\|dot\|text\|html>] [--tag <tag>] [--formal-only]` | Write the decision atlas; no flags writes the full atlas (English chrome by default, `--lang zh` for Chinese), `--record` is one deliberation tree, and `--map` selects the decision map. `--format` sets the selected object's format; the full atlas supports only HTML |
| `adrkit completion <bash\|zsh\|fish>` | Print shell completion |
| `adrkit version` | Print version |
| `adrkit help` | Print help |

The full atlas offers two independent themes: **Folio** uses warm paper and editorial typography; **Signal** uses dark surfaces, cyan accents and a compact layout. An AI can choose `--theme folio` or `--theme signal`; omitting `--theme` or passing `--theme random` rolls Folio 30% / Signal 70% once at generation, favoring the flagship Signal theme. The HTML keeps that theme across reloads, with no system appearance detection or theme switch. `--theme` applies only to the full atlas, not `--map` or `--record`.

For a new atlas without a clear visual preference, the agent should prefer `--theme random` and proceed without asking the user to choose. Honor explicit theme or visual requests; when updating an existing file, preserve its selected theme unless the user requests a change or a fresh random choice. Do not infer style from the operating system or project category.

`adrkit atlas --format html --out adr.html` writes the full atlas, just like
omitting `--format`. To generate only the decision map, use
`adrkit atlas --map --out map.html` (HTML by default), or add
`--format mermaid|dot|text|html`. Map filters `--tag` and `--formal-only`
require `--map`; `--map` and `--record` are mutually exclusive. `--lang`
applies to the full atlas, including explicit `--format html`.

Breaking change: old `atlas --format <format>` map exports now require
`--map`. A non-HTML format without an explicit map or record fails with a hint;
HTML without `--map` generates the full atlas.

All three objects default to HTML. `atlas --record <name>` and
`atlas --record <name> --format html` produce the same deliberation tree;
`--format mermaid|text` exports its source. The old `--diagram` flag is removed.
Positional arguments are rejected; use `--record <name>` for a record.
With `--out`, the receipt names the object, format, and absolute destination,
for example `wrote deliberation tree (html) to /path/tree.html`.
Without `--out`, stdout contains only the artifact.

`-h, --help` prints help; `-V, --version` prints the version. Unsupported
options fail rather than being ignored. Positional arguments follow each
command's synopsis: `record`, `propose`, and `note` join unquoted shell words
into one title or text, so quoting is optional; every other command takes at
most the positional arguments its synopsis shows, and extras fail rather than
being ignored. Command output and error messages are English only; `--lang`
affects only the atlas page. `--raised-by` says who introduced
a shipped choice; `--decided-by` says whose judgment settled it. Both are
declarations, not CLI inferences. `--reason` is required for rejection and
archival. The CLI cannot verify that code shipped or another authoritative
owner exists. `--tools claude` adds `.claude/` copies alongside the default
`.agents/`; `--tools none` installs no integrations.

Repository-wide validation also checks `@adr <number>` citations in code and
configuration files. A citation must name an implemented decision; when that
decision declares `paths`, the citing file must match one of them. A citation
to a missing, archived, or superseded decision
fails and names the line and, for a superseded decision, its successor. Markdown
and the root `site/` documentation copy are not scanned, and citations are
optional: only the ones that exist are checked.

## Validation coverage

`adrkit validate <name>` checks one record. `--all` adds the corpus checks
below. Validation is supposed to fail on fresh records until their required
sections are filled in.

Per record, in every mode, including archived records.

- Front matter: parseable canonical layout, no unknown fields; `created`
  present, a real calendar date, and not after the status date; `commit`
  (when present) a git hash.
- `tags` (when present): non-empty, lowercase kebab-case, no duplicates.
- `paths` (when present): non-empty, repository-relative, forward slashes,
  no `..`, no duplicates, and every static directory anchor (or full literal
  path) still exists in the repository.
- Sections: the required headings per status exist without duplicates, and
  every required section carries written content: `Problem`, `Decision`/
  `Proposal`, `Alternatives considered`, and `Consequences` for a decision;
  `Problem`, `Proposal`, `Alternatives considered`, `Acceptance criteria`,
  and `Risks` for a proposal. HTML comments and fenced code do not count.
- Folder consistency: implemented records are `N-slug.md` with title
  `# ADR: N <title>`, matching numbers, `raised-by` and `decided-by`, and no
  proposal-era sections; proposals are dated `YYYY-MM-DD-slug.md`, unnumbered,
  with no provenance fields; `superseded` names another decision; archive
  metadata appears only in `archived/`.
- Body references (`ADR-12`, `ADR 4`, or `ADR12`) in visible prose resolve to
  existing decisions; a word that merely contains ADR (like `MADR-12`) is not
  a reference, text inside fenced code or HTML comments is not a reference,
  and forward references to numbers not yet assigned to proposals fail too.
- `### Later changes` entries in implemented records open with
  `**Amended by ADR N:**`; a trailing `ADR N later` block, a block that
  loses the opening, or ordinary text before the first entry fails, while a
  paragraph continuing an entry does not.
- Supersession chains resolve without cycles to an implemented decision;
  no backlink from the successor is required.
Repository-wide (`--all`), additionally:

- The four lifecycle folders are the whole inventory: unknown folders,
  records at the `adr/` root, and nested folders fail. `adr/config.yaml`
  exists and its known fields are well-typed.
- Decision numbers are unique across `implemented/` and `archived/`.
- `@adr <number>` citations in code and configuration (details above);
  unreadable source files or directories fail with a scan diagnostic.
- Archived records satisfy the same format, path, and reference checks as the
  rest of the inventory.

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

## Failed source removal on a lifecycle move

Every lifecycle move stages the target first and removes the source second:
`archive` and `supersede` write the archived file, `implement` writes the
numbered decision, and `reject` writes the rejected record. If source removal
fails, the command removes the staged copy again, exits non-zero, and reports
both paths and the underlying error. The source survives; the move is not
half-completed, and re-running the command cannot allocate a second number for
the same proposal. Fix the filesystem error and retry; the replacement in a
supersession stays active.

## Scope retrieval for changes

```sh
adrkit relevant src/payments/api.ts       # planned paths; Git is optional
adrkit relevant --base HEAD               # exact commit → working tree + untracked
adrkit relevant --staged                  # index only, including before first commit
```

Choose one input source; flags and explicit paths cannot be combined. `--base`
uses the exact supplied commit, not a merge-base; choose the intended review base
explicitly. It includes staged and unstaged changes plus non-ignored untracked
files. `--staged` excludes unstaged-only and untracked-only changes. Both include
deleted files and both endpoints of renames, normalize paths to the nearest ADR
root, and never expand Git file paths into directory walks. An empty diff is
reported as no changed paths, not proof that no decisions apply. Git or invalid
ref failures exit non-zero rather than returning an empty context.

Explicit directory inputs search at most 2,000 files per directory argument,
skipping `.git` and `node_modules`. Truncation or filesystem read errors retain
acquired matches, name the diagnostic, and exit **1**; narrow the paths or resolve
the error before relying on the result. A nonexistent explicit path remains a
valid planned-file query. Malformed or unreadable active records fail retrieval;
archived records are not read. A count of active records without `paths:` is
advisory even when other records match: use `adrkit list` to judge their relevance.
Successful retrieval is a scope shortlist, not evidence that code complies or
that all architectural constraints were found. Read relevant records in full.

## Concurrent decision writes

Numbered writes claim `adr/.write-N.lock` exclusively before checking both
`implemented/` and `archived/` and writing. Competing writers fail and can
re-run to allocate the next available number. New implemented records never
overwrite an existing file; archive staging retains its same-name write behavior.
The lock is removed on success or a handled error. If a process is forcibly
terminated, confirm no writer for that number is running before deleting its
leftover lock file and re-running. This protects decision-number writes only;
run lifecycle commands one at a time.
