# Workflow

## When to record

Record architectural choices that constrain future development and whose
rationale is not apparent from code alone, such as storage, module boundaries,
compatibility, or deployment decisions. Record real choices and trade-offs;
reuse existing records, and supersede them when important assumptions change.
Routine implementation details and local fixes need no ADR. A task without
an important architectural decision needs no new record or decision report.
`accepted` denotes a recorded decision, not proof of human review; the
`raised-by` and `decided-by` fields record where the choice came from (who
raised it, and whose judgment settled it) and are not an authorization record.

## The default path: record a decision

```text
adrkit init
adrkit decide "Use SQLite for session storage" --raised-by human --decided-by human
# fill in the decision
adrkit validate
```

Decisions are durable records in `adr/decisions/N-slug.md`. Recording one is
the default action; deliberation happens before the command, though a session's
design tree can be kept in the record's optional `## Deliberation` appendix.

## Grilling before the record

When an important choice is still under discussion and the direction is not yet
settled, the `adrkit-grill` workflow skill interrogates you about it — a design
tree worked in rounds — until nothing is left silently assumed. Grilling ends in
`adrkit decide`, never in a proposal: the session's root questions become
`## Problem`, the options you rejected become `## Alternatives considered`,
and the settled tree is kept in the optional appendix below.

## The `## Deliberation` appendix

A record may carry an optional `## Deliberation` appendix: the design tree
behind the decision, stored as a nested Markdown list. A node may end with
`[settled]`, `[rejected]`, or `[open]`; prose between bullets is ignored, so
a session can interleave commentary. Render the tree with:

```text
adrkit tree <name>            # nested text outline (default)
adrkit tree <name> --mermaid  # Mermaid graph
```

`<name>` resolves by title, file name, or decision number. The appendix is
reference material for that one decision, not part of every task's reading.

## Proposals: ephemeral drafts

When a decision still needs review, create a draft instead:

```text
adrkit propose "Use SQLite for session storage"
# fill in the draft
adrkit accept "Use SQLite for session storage" --raised-by human --decided-by human
```

`adrkit accept` validates the draft and performs the mechanical rewrite a
lifecycle move always owed:

- `## Proposal` becomes `## Decision`
- `Acceptance criteria` and `Risks` are folded into `## Consequences`
- the draft is promoted to `adr/decisions/N-slug.md` and deleted

A draft that does not become a decision is discarded:

```text
adrkit reject "Use SQLite for session storage" [--reason "we chose files"]
```

`reject` deletes the draft and leaves no record. Rejection lives in the
winning decision's `Alternatives considered`, not in a standalone record.

## Superseding an accepted decision

Decisions get overturned. Record the replacement first, then retire the
outdated record:

```text
adrkit decide "Use Postgres for session storage" --raised-by human --decided-by human
# fill in the new decision, validate it
adrkit supersede 1 --by 2
```

The old record stays in `adr/decisions/` with `status: superseded` and
`superseded-by: 2` in its front matter. Only the front matter is
rewritten; the body is frozen history. The record's `raised-by` and
`decided-by` values are preserved rather than replaced: they record who raised
the original decision and whose judgment settled it, not who retired it.
`validate` checks that the referenced number exists and is not itself
superseded, so a chain always ends at a currently-accepted decision.

## Read decisions before coding

ADR sets are usually small. At the start of a coding, design, or review task,
read the existing decisions before making choices. Add the following section
to the project's `AGENTS.md`, and also `CLAUDE.md` when that is the team's
entry point. Preserve existing instructions; merge an equivalent section
instead of duplicating it. The init skill guides the agent through this step;
the CLI's `init` / `update` installs workflow files without editing project
instructions. For an existing project, run `adrkit update` to refresh skills
and add this section too.

```markdown
## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run
`adrkit list` and read every decision in full with `adrkit show <N>` (or read
its file). ADR sets are small; do not filter by title alone. Treat accepted
records as decision context, superseded records as history, and pending
drafts as unaccepted proposals. Check relevant decisions against current
code and the task's requirements. Apply the constraints that still hold;
explain conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.

A `## Deliberation` appendix records the design tree behind a decision. It is
reference material: read it only when that decision is in play, not on every
task.

Record an ADR when an architectural choice will constrain future development
and its rationale is not apparent from code alone. Record only decisions
actually made and genuine alternatives and trade-offs; do not invent reasons
to fill a template. Reuse an existing record for the same choice; record a
replacement when important assumptions change. Routine implementation details,
local fixes, and easily reversible choices need no ADR. If no important
architectural decision was made, create none. `accepted` means a recorded
decision, not proof of human review. `decided-by` is a declaration, not an
inference: `human` when a person determined the direction — they stated it,
changed a proposal into what shipped, or you are recording one they made
earlier — `agent` when it came from the agent's own judgment, including when a
person only let it through. The CLI neither infers nor verifies it, so say who
proposed and who approved in the body when that matters.
```

## Agent workflow

The records are the interface: an agent reads `adr/decisions/*.md` directly,
because the front matter is YAML and the body is the decision. The CLI supplies
the state a single file cannot show:

```bash
adrkit status        # lifecycle counts and repository validity
adrkit instructions  # the next executable step, per pending draft
adrkit validate      # the format gate; non-zero exit on any issue
```
