# Workflow

## When to record

Preserve important context missing from existing sources. Honor explicit user requests to preserve a choice without making similar edits record-worthy.

Before creating or shaping a record, ask:

1. **What would be lost?** Find a constraint, reason, or genuine trade-off that code, tests, and existing documentation do not reliably explain, especially context held only in a user conversation. An implementation result alone is insufficient.
2. **What would forgetting cost?** Identify a plausible future mistake and its consequences. Weigh importance and breadth of impact; a local decision with severe consequences can qualify. Do not invent disasters to justify recording.
3. **What should survive?** Preserve the stable choice, boundary, and reason. Consider longevity and resistance to becoming stale separately; leave volatile facts to code, configuration, tests, or existing docs.

Use judgment, not a score or an all-must-pass checklist. If nothing meaningful would be lost, skip without a justification field, user approval, or deferred note. Notes are candidates, not commitments to ADRs.

| Usually leave to existing sources | Potentially worth preserving |
| --- | --- |
| Upgraded adr-kit to a new version; Git and the lockfile retain the event | A user-only constraint requires tools to work without public-network access, governing future dependencies and upgrades |
| Adjusted a button's spacing or shadow; styles and visual checks own the result | A durable accessibility constraint limits future visual changes, and its reason is otherwise hidden |
| Selected a library; the manifest already shows which one | A deployment restriction explains why an otherwise attractive library or runtime mechanism is unsuitable |

Judge information, not topic names; an existing record is not precedent for recording similar edits. Update only claims made false by a change; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest moving details to their existing owner or authorized archival when the rationale no longer guides work. Do not silently rewrite choices, ignore constraints, delete a record, or archive it without authorization.

Grilling uses the same selection judgment. If an outcome qualifies, preserve the
complete session tree in its Deliberation appendix; local answers are context,
not separate ongoing obligations. If none qualifies, summarize in conversation
and create no record. A settled choice is not necessarily shipped work.

Agent behavior can be evaluated with the [recording judgment cases](recording-evaluation.md).
These are a manual protocol; template tests do not prove model quality.

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
   changes. Both refuse while code still cites the record, listing each
   `path:line`: moving it would strand citations that `validate` rejects, so
   repoint or remove them first. `supersede` also refuses a `--by` decision
   numbered lower than the record it replaces.
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
  same choice or mechanism. Judge overlap from content, not titles alone.
  Extend a duplicate; link an unshipped full replacement as intent and keep
  the old decision active until the replacement ships, then resolve it through
  `adrkit supersede --by` in that delivery change; link a partial overlap
  while the older record stays active.
- **When shipping**, compare the record's claimed paths, names, defaults, and
  mechanisms with the current code and tests, and state shipped facts rather
  than proposal-era intent. If a code change alters only the realization of
  an active decision, update facts the record actually claims. Changes within
  its implementation freedom need no update; a changed recorded choice is
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
title matching: inspect descriptions, paths, relationships, and task scope; when a
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
