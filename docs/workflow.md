# Workflow

## When to record

Record architectural choices that constrain future work and whose rationale
is not obvious from code. Record genuine alternatives and trade-offs; routine
fixes need no ADR. A grilling session is itself the importance signal, so
record every choice it settles. Do not confuse a settled choice with shipped
work.

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
   appearing stale — rejections are unnumbered and unsealed, so removing a
   redundant one cannot reuse a number or break the archive.
4. Full replacement uses `adrkit supersede <old> --by <new>`; the old
   numbered record moves to `archived/` with `superseded-by`. Partial
   replacement leaves still-relevant guidance active. `adrkit archive <N>
   --reason "<current authority>"` retires other low-guidance implemented
   records when current behavior has another owner. Never archive by age.
   Both commands seal the final archived file in `adr/archived/MANIFEST.json`;
   a sealed record is never edited again.
5. `adrkit validate` checks all four directories and the archive seal.
   `adrkit validate --base <git-ref>` additionally proves the archive only
   grew since that ref, which CI runs against the PR base or push head.
   Fresh templates fail until required sections are filled.
   `adrkit graph --html` visualizes numbered decisions and their history;
   `adrkit tree <name> --html` renders an optional `## Deliberation` appendix.

## Keep records and shipped code aligned

Creating, shipping, and reviewing are one governance loop:

- **Before creating** a proposal or record, search the active records for the
  same choice or mechanism. Judge overlap from content, not titles or tags.
  Extend a duplicate; fully replace through `adrkit supersede --by` in the
  same change; link a partial overlap while the older record stays active.
- **When shipping**, compare the record's claimed paths, names, defaults, and
  mechanisms with the current code and tests, and state shipped facts rather
  than proposal-era intent. If a code change alters only the realization of
  an active decision, update those facts in that record; a changed choice is
  a new record with an explicit relationship.
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
title matching: inspect tags, paths, relationships, and task scope. Check
records against current code, explain changed assumptions, and mention
relevant ADR numbers in the work summary. Re-read when the task or scope
changes. Agent skills guide lifecycle operations but the CLI does not
automatically edit `AGENTS.md` or `CLAUDE.md`.
