# Workflow

## When to record

The recording test lives in the installed workflow skills: `adrkit-propose`,
`adrkit-record`, and `adrkit-grill` carry the four questions that decide
whether a choice is an ADR. Agents read the skills; this page does not restate
them.

Grilling uses the same test. If an outcome qualifies, preserve the complete
session tree in its Deliberation appendix; local answers are context, not
separate ongoing obligations. If none qualifies, summarize in conversation and
create no record. A settled choice is not necessarily shipped work.

Agent behavior can be evaluated with the [recording judgment cases](recording-evaluation.md).
These are a manual protocol; template tests do not prove model quality.

## Lifecycle

Each stage is owned by an installed skill: `adrkit-propose` creates an
unnumbered `proposed/` draft, `adrkit-implement` promotes a shipped proposal to
`implemented/`, `adrkit-record` records a shipped choice without a proposal,
`adrkit-reject` keeps a durable `rejected/` anti-pattern, and `adrkit-supersede`
or `adrkit-archive` moves retired guidance to `archived/`. `adrkit-validate`
checks all four folders. The flags, refusal rules, and retirement semantics
live in those skills and the CLI reference; this page does not repeat them.

`adrkit-visualize` owns browsing, including its optional example atlas.

## Keep records and shipped code aligned

The procedure is split across the installed skills: `adrkit-propose` searches
for overlap before creating, `adrkit-implement` compares claimed facts with the
shipped code and tests, and `adrkit-review` checks changed records against
changed code for stale realization facts and unresolved supersession. See those
skills.

## Read decisions before coding

`adrkit-propose`, `adrkit-record`, and `adrkit-review` carry the reading
posture: the four folders as a context budget, `adrkit list` / `adrkit relevant`
/ `adrkit show`, and re-reading when the task or scope changes. The optional
`AGENTS.md` section advertises the commands without prescribing when to run
them; the CLI never edits it.


## Co-design with evidence

`adrkit-grill` owns questioning and the evidence discipline; `adrkit-propose`,
`adrkit-record`, and `adrkit-review` require grounded observations rather than
invented reasons. `adrkit-note` covers one-line capture with an optional
source. At review, `adrkit-review` reruns retrieval for actual changes with
`adrkit relevant --base <review-base>` or `adrkit relevant --staged`. See those
skills.
