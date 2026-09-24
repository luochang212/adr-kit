# Record format

ADR Kit stores Markdown with YAML front matter in four lifecycle directories:

| Directory | Status | Filename | Meaning |
| --- | --- | --- | --- |
| `adr/proposed/` | `proposed` | `YYYY-MM-DD-slug.md` | Unshipped proposal |
| `adr/implemented/` | `implemented` | `N-slug.md` | Shipped, active decision |
| `adr/rejected/` | `rejected` | `YYYY-MM-DD-slug.md` | Formally declined proposal |
| `adr/archived/` | `implemented` or `superseded` | `N-slug.md` | Frozen history |

The canonical front matter order is `status`, `date`, `raised-by`,
`decided-by`, `created`, `commit`, `superseded-by`, `reason`,
`archived`, `archive-reason`, `tags`. Only applicable fields appear.
`date` is machine-stamped at every lifecycle move; `created` preserves the
record's birth date. `archived` is the archival date and matches `date`
when a record enters frozen history.
The header is followed by a blank line and `# ADR: <title>` (or
`# ADR: N <title>` for numbered decisions).

Proposals require `Problem`, `Proposal`, `Alternatives considered`,
`Acceptance criteria`, and `Risks`. Implemented and archived decisions
require `Problem`, `Decision`, `Alternatives considered`, and
`Consequences`; proposal-era sections must not remain. A rejected proposal
keeps its problem, proposal, and alternatives and adds a non-empty `reason`
field. New templates intentionally fail validation until substantive sections
are written outside HTML comments.

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
duplicate numbers, malformed dates, mismatched folder/status pairs, and
dangling ADR references.
