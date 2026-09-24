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
3. `adrkit reject <name> --reason "<why>"` retains a formally declined
   proposal in `rejected/`, without an ADR number.
4. Full replacement uses `adrkit supersede <old> --by <new>`; the old
   numbered record moves to `archived/` with `superseded-by`. Partial
   replacement leaves still-relevant guidance active. `adrkit archive <N>
   --reason "<current authority>"` retires other low-guidance implemented
   records when current behavior has another owner. Never archive by age.
5. `adrkit validate` checks all four directories. Fresh templates fail until
   required sections are filled. `adrkit graph --html` visualizes numbered
   decisions and their history; `adrkit tree <name> --html` renders an
   optional `## Deliberation` appendix.

## Read decisions before coding

At task start, run `adrkit list` to discover the inventory. Read relevant
implemented records in full, check relevant proposed and rejected records,
and consult archived records only for history. Relevance requires more than
title matching: inspect tags, paths, relationships, and task scope. Check
records against current code, explain changed assumptions, and mention
relevant ADR numbers in the work summary. Re-read when the task or scope
changes. Agent skills guide lifecycle operations but the CLI does not
automatically edit `AGENTS.md` or `CLAUDE.md`.
