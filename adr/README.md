# Architecture Decision Records

ADR Kit stores Markdown records by lifecycle:

| Folder | Meaning |
| --- | --- |
| `proposed/` | Dated, unnumbered proposals for work not yet shipped |
| `implemented/` | Numbered decisions that have shipped and still guide work |
| `rejected/` | Dated proposals declined with an explicit reason |
| `archived/` | Numbered, frozen history no longer authoritative |

`propose` creates a proposal. After the work ships, `implement` promotes it
and assigns an ADR number. Use `record` for an already-shipped choice.
`reject --reason` preserves a declined proposal. `supersede --by` replaces
an implemented decision and archives it; `archive --reason` retires an
implemented record whose current behavior has another authoritative owner.
Do not archive by age or quota. Numbers remain stable in history.

The front matter carries `status`, `date`, `created`, optional `tags`,
and lifecycle metadata. Implemented decisions also declare `raised-by` and
`decided-by`. Proposals have `Problem`, `Proposal`, `Alternatives considered`,
`Acceptance criteria`, and `Risks`; implemented records have `Problem`,
`Decision`, `Alternatives considered`, and `Consequences`.

Discover with `adrkit list`, read relevant implemented records in full,
check relevant proposals and rejections, and consult archived records for
history. Run `adrkit validate` before committing.
