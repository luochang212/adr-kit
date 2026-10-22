# Record format

ADR Kit stores Markdown with YAML front matter in four lifecycle directories:

| Directory | Status | Filename | Meaning |
| --- | --- | --- | --- |
| `adr/proposed/` | `proposed` | `YYYY-MM-DD-slug.md` | Unshipped proposal |
| `adr/implemented/` | `implemented` | `N-slug.md` | Shipped, active decision |
| `adr/rejected/` | `rejected` | `YYYY-MM-DD-slug.md` | Declined proposal (anti-pattern memory) |
| `adr/archived/` | `implemented` or `superseded` | `N-slug.md` | Frozen history |

The canonical front matter order is `status`, `date`, `raised-by`,
`decided-by`, `created`, `commit`, `superseded-by`, `reason`,
`archived`, `archive-reason`, `tags`, `paths`. Only applicable fields appear.
`date` is machine-stamped at every lifecycle move; `created` preserves the
record's birth date. `archived` is the archival date and matches `date`
when a record enters frozen history.
The header is followed by a blank line and `# ADR: <title>` (or
`# ADR: N <title>` for numbered decisions).

Proposals require `Problem`, `Proposal`, `Alternatives considered`,
`Acceptance criteria`, and `Risks`. Implemented decisions require `Problem`,
`Decision`, `Alternatives considered`, and `Consequences`; proposal-era
sections must not remain. Archived decisions keep the same decision shape and
are checked by the current format like any other record; a later format change
is a normal migration commit. Promotion folds a
proposal's `## Acceptance criteria` and `## Risks` into `### Verification`
and `### Trade-offs` under `## Consequences`; an implemented record must not
carry the old H3 names directly under Consequences. That check ignores fenced
code and HTML comments and applies to implemented records only. A decision
amended by a later decision keeps its original text and carries an optional
`### Later changes` subsection at the end of `## Consequences`: each entry
opens with `**Amended by ADR N:**`, states what now runs, and closes with what
above is unchanged. `adrkit validate` enforces the form on implemented records:
the old trailing-prose form fails with a pointer to the subsection, and every
entry must keep the opening. The folders
are also a context budget: `implemented/` is current authority and is read
in full; `proposed/` is intent and is checked; `rejected/` is anti-pattern
memory that is checked; `archived/` is lowest-value frozen history that is
not read by default. A rejected proposal keeps its problem, proposal, and
alternatives and adds a non-empty `reason` field naming the tempting mistake
it blocks; the record is durable and is removed only when another record owns
that warning. New templates intentionally fail validation until substantive
sections are written outside HTML comments. Headings inside comments or
fenced examples do not create sections. Comment markers inside fenced examples
are literal text. Before removing a proposal, `implement` validates the generated
decision and refuses collisions with its canonical sections.

`raised-by` and `decided-by` are required on numbered decisions and
forbidden on unnumbered proposals and rejections. Each is `human` or
`agent`: the former says who introduced the choice; the latter says whose
judgment settled it. Passive approval does not make an agent-origin choice
human. The CLI records declarations; it cannot infer or verify provenance or
delivery.

`supersede` sets `status: superseded`, `superseded-by: N`, and archive
metadata before moving the old numbered decision to `archived/`. The chain
must end at an implemented decision without missing targets or cycles.
`archive` moves an implemented decision with `archived` and
`archive-reason`, leaving its status implemented as historical state.
Archived records retain stable numbers. Optional `tags` are non-empty,
unique lowercase kebab-case keywords; optional `## Deliberation` preserves
the design tree. `adrkit validate` checks all four directories and rejects
duplicate numbers, malformed dates, mismatched folder/status pairs, records
outside the four folders, and dangling ADR references: a record body may
reference decisions as `ADR-12`, `ADR 4`, or `ADR12`, and a reference to a
number that does not exist fails repository-wide validation.

Optional `paths` scope a record to the files it governs — a different axis
from `tags`: tags classify by theme, `paths` answer "which decisions govern
this file?". Entries are unique repository-relative globs with forward
slashes; `**` crosses directory separators, `*` stays within one segment,
`?` matches one character, and every other byte is literal (no brace
expansion, no character classes); an entry that starts with `*` needs
quotes in YAML flow style (`paths: ["**/*.ts"]`). `adrkit relevant <path>...` lists the
records whose scopes govern the given file or directory, grouped by
lifecycle posture; archived records are frozen history and are not searched
by default, and a record without `paths` never matches — scope retrieval is
not full-text search. The field survives every lifecycle move and the
proposal-to-decision promotion. `adrkit validate` rejects an empty or
duplicate entry, an absolute path, a `..` segment, a backslash, and an
entry whose static directory anchor does not exist in the repository
(the complete directory components before the first wildcard, or the full
literal path when there is no wildcard; `src/cli*.ts` checks `src`) — the drift check that fails a scope stranded by
a rename. Archived records are checked the same way; a stale path is a
normal migration fix.

Code may cite a record with `@adr <number>` in a comment; `adrkit validate`
fails when the citation names a missing, archived, or superseded decision, or a
file outside the record's `paths`.

## Archived history

`archived/` is ordinary Git-tracked history. `adrkit archive` and
`adrkit supersede` move the record and stamp its lifecycle fields; there is no
separate manifest or seal. `adrkit validate` checks an archived record like any
other record, and Git history is the audit for later changes. A format
migration is a normal commit with a stated reason.
