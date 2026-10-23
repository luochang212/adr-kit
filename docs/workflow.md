# Workflow

## When to record

Record architectural choices that constrain future work and whose lasting
rationale or genuine trade-offs are not adequately explained by code, tests,
and existing documentation. A behavior change alone does not qualify. Record
genuine alternatives and trade-offs; routine fixes need no ADR.

Records cost time to write, read, and maintain, and stale records can mislead;
record only when preserving the rationale is worth that cost. For example,
routing all writes through one boundary to preserve validation and auditing can
merit an ADR: a later direct write may look locally correct while bypassing
those guarantees. Routine fixes and local renames usually need none when code
and tests adequately explain them.

A grilling session is itself the importance signal, so record every choice it
settles. Do not confuse a settled choice with shipped work.

## Lifecycle

1. `adrkit propose "<title>"` creates an unnumbered file in `proposed/`.
   It may be edited and committed for review. A settled but unshipped
   direction stays here.
2. After the work ships, `adrkit implement <name> --raised-by <human|agent>
   --decided-by <human|agent>` validates and promotes it to numbered
   `implemented/`. Use `adrkit record <title>` with the same declarations
   for a choice already shipped without a proposal.
3. `adrkit reject <name> --reason "<the tempting mistake this blocks>"`
   records a durable anti-pattern in `rejected/`, without an ADR number. Keep
   it; remove it only when another record owns the warning it blocks, never for
   appearing stale. Rejections are unnumbered, so removing a redundant one
   cannot reuse a number.
4. Full replacement uses `adrkit supersede <old> --by <new>`; the old
   numbered record moves to `archived/` with `superseded-by`. Partial
   replacement leaves still-relevant guidance active. `adrkit archive <N>
   --reason "<current authority>"` retires other low-guidance implemented
   records when current behavior has another owner. Never archive by age.
   Both commands move the final record into `archived/`; Git records later
   changes.
5. `adrkit validate` checks all four directories, including archived records.
   Fresh templates fail until required sections are filled.
   `adrkit atlas` writes the browsable decision atlas;
   `adrkit atlas --record <name>` renders an optional `## Deliberation` appendix.

The `adrkit-visualize` skill also carries an optional decision-atlas example at
`examples/decision-atlas.html` inside the installed skill. Consult it for a
richer browsing request and adapt only the useful sections to the target
repository; small sets can stay a list or the built-in map. It is a reference
snapshot, not a new CLI format or a mandatory layout.

## Keep records and shipped code aligned

Creating, shipping, and reviewing are one governance loop:

- **Before creating** a proposal or record, search the active records for the
  same choice or mechanism. Judge overlap from content, not titles or tags.
  Extend a duplicate; link an unshipped full replacement as intent and keep
  the old decision active until the replacement ships, then resolve it through
  `adrkit supersede --by` in that delivery change; link a partial overlap
  while the older record stays active.
- **When shipping**, compare the record's claimed paths, names, defaults, and
  mechanisms with the current code and tests, and state shipped facts rather
  than proposal-era intent. If a code change alters only the realization of
  an active decision, update those facts in that record; a changed choice is
  a new record with an explicit relationship.
- **When code implements a decision**, cite it in a comment with `@adr <N>`
  (`@adr 14, 22`). Citations are optional; `adrkit validate --all` fails when
  one names a missing, archived, or superseded decision, or a file outside
  that decision's `paths`.
- **When reviewing**, the `adrkit-review` workflow checks changed records
  against changed code, searches for stale realization facts and unresolved
  supersession, and reports evidence-backed findings. It is scoped to
  decision-record coherence, not general code review, and finding no issue is
  a valid result.

## Read decisions before coding

At task start, run `adrkit list` to discover the inventory. The four folders
are a context budget: read the relevant `implemented/` records in full; check
the relevant `proposed/` records for intent and the relevant `rejected/`
records for the bad cases they warn against; treat `archived/` as frozen
history and read it only when a task explicitly cites it. Relevance requires more than
title matching: inspect tags, paths, relationships, and task scope; when a
task targets specific files, `adrkit relevant <path>` retrieves the records
whose `paths:` scopes govern them. Check
records against current code, explain changed assumptions, and mention
relevant ADR numbers in the work summary. Re-read when the task or scope
changes. Agent skills guide lifecycle operations but the CLI does not
automatically edit `AGENTS.md`.


## Co-design with evidence

Before editing, use `list` and `relevant <planned path>...`, then `show` to read
relevant implemented records, proposals, and rejections. During exploration,
separate constraints that still hold, changed assumptions, and conflicts. Cite
inspected code as file:line or a symbol, external facts by source link, and
participant statements with attribution. Distinguish observation, inference,
and unknown; implementation alone does not explain why an alternative lost.
Never invent reasons or alternatives to fill a template. Evidence stays in
ordinary Markdown in the existing sections, without a new mandatory field.

A note may keep an available source on the same line, for example:
`Candidate: use SQLite; rationale unknown; source: PR #42`. Links are optional;
one-line capture stays cheap. A candidate is not a settled decision, and a note
proves neither delivery nor provenance. Inspect its source before shaping it;
expose truncated excerpts or mismatched sessions instead of silently using them.

At review, rerun retrieval for actual changes: `adrkit relevant --base
<review-base>` compares the exact commit with the working tree plus non-ignored
untracked files; `adrkit relevant --staged` uses the index only. Delete and rename
origins are included. Supplement scoped matches with inventory reading, resolve
incomplete-search diagnostics, and read matching records in full. Zero matches
are not permission to skip constraints. A validation pass proves record
validity; code adherence requires its own review and applicable test evidence.
