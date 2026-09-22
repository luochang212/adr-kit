# Record Format

Every ADR is YAML front matter followed by a Markdown body:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
raised-by: human | agent
decided-by: human | agent
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

Front matter fields are written in the order `status`, `date`, `raised-by`,
`decided-by`, `created`, `commit`, `superseded-by`, `reason`, `tags`; only the
fields that apply are present. `commit` is the short git hash of the state the
decision was recorded against, stamped automatically when the repository is
under git; a later lifecycle move re-stamps it to that move's state.
`superseded-by` is required on superseded decisions and forbidden otherwise.
Unknown fields are reported by `validate`.

The `date` field records when the current status was reached. The CLI
stamps it at every lifecycle move (`decide`, `accept`, `supersede`), so it
is machine-written, never hand-maintained. `created` is the birth date,
stamped once at creation and never re-stamped, so the time axis survives
later lifecycle moves. `tags` is an optional list of kebab-case keywords
(for example `frontend`, `execution-layer`) that `adrkit graph` uses to
group and filter decisions by theme; `validate` checks their shape but
never requires them, and every lifecycle move keeps the list.

## Who raised it, who settled it: `raised-by` and `decided-by`

A durable record carries two provenance fields, each `human` or `agent` and
each required on accepted and superseded decisions; a draft carries neither, and
`accept` refuses to promote one that does. `decide` and `accept` require the
caller to declare it with `--decided-by human|agent` for the settling judgment
and `--raised-by human|agent` for the raising party; `propose` never writes
either, and `supersede` preserves the original values.

`raised-by` is who put the decision on the table. `decided-by` is whose
judgment settled it. The two are independent: a person may raise what the agent
settles, and the agent may raise what a person settles, so any combination is
valid.

For `decided-by`, `human` means a person determined the direction: they stated
the choice, or an agent proposed one and the person changed it into what actually
shipped — or the person made the choice earlier and an agent is only now
recording it. `agent` means the direction came from the agent's own judgment. A
person simply letting an agent's proposal through without engaging with the
choice does not move the source to `human`: the record stays `agent`, and the
body is where you say they approved it. Each field answers one question —
`raised-by` where the issue came from, `decided-by` whose judgment the outcome
reflects — so each carries a single value and is never co-signed. Who redirected
and who approved belong in `## Decision` as prose, not in the front matter. When
the writer cannot tell which value applies, the workflow is to ask before
recording.

Each value is a declaration, not an observation. The CLI neither infers nor
verifies it: no environment, terminal, or session marker can reveal who chose,
so the command asks the caller and records the answer. The declaration is
weaker evidence than the observed `date` and `commit` fields, and it
cannot establish who independently chose or approved a decision. It is defeated
by a careless or false declaration, which leaves no trace any check can detect,
and by editing the file afterwards, which changes the value freely. Likewise,
`accepted` means the decision is
formally recorded, not that a human has reviewed it. Git records commit
identity separately.

`validate` is read-only: it reports a missing or unknown `raised-by` or
`decided-by` and never writes one, because the values are declarations only
the caller can make.

## Drafts (proposals)

File name: `YYYY-MM-DD-slug.md`, location `adr/.drafts/`. Front matter:
`status: proposed`. Required sections:

```markdown
## Problem
## Proposal
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Alternatives considered` must contain at least one written alternative
after HTML comments are stripped.

Drafts are ephemeral and outside the `validate` surface: `adrkit accept`
validates a draft right before promoting it into a decision, and `adrkit
reject` discards it without leaving a record.

## Decisions

File name: `N-slug.md`. Title: `# ADR: N <title>`. Required sections:

```markdown
## Problem
## Decision
## Alternatives considered
## Consequences
```

Proposal-era sections (`Proposal`, `Acceptance criteria`, `Risks`, `Plan`,
`Migration plan`) are rejected in accepted decisions.

Superseded decisions keep the accepted shape but carry the replacing
decision number in the front matter:

```markdown
---
status: superseded
date: 2026-08-19
superseded-by: 6
---
```

`validate` follows the complete replacement chain: every target must exist,
no number may repeat, and the chain must end at an accepted decision.
Chains such as `1 → 2 → 3` are valid; historical links are never flattened. Superseded records stay in `adr/decisions/` as frozen history.

## Cross-references

A record body may name another decision with `ADR-N` or `ADR N`. These are the
references `adrkit graph` draws as dashed edges, and `adrkit validate` reports a
reference to a decision number that does not exist; a record's own number is not
a reference. Front-matter links (`superseded-by`) are checked the same way.

## The deliberation appendix

A decision may carry an optional `## Deliberation` appendix: the design tree
behind the choice, stored as a nested Markdown list. A node is
`- [Q: | A: ]<text>[ [status]][ (recommended)][ — <reason>]`: `Q:`/`A:` marks
a question or an option (inferred otherwise), `[settled]` / `[rejected]` /
`[open]` is its state, `(recommended)` marks the option the agent recommended,
and ` — <reason>` explains it. The em dash with surrounding spaces is the only
separator, so a hyphen in the text stays text, and when it appears more than
once the first one starts the reason. Dependency is nesting: a
follow-up question is a
child of the node whose settlement raised it, so related questions run deeper
and unrelated ones stay flat. A question's answer is its `[settled]` option
child; a settled follow-up question is not an answer. When the tree also marks
a recommended option and that option child is not it, the question is shown as
an override. `adrkit tree <name>` renders the tree as text by default, as mermaid
with `--mermaid`, or as an offline interactive card tree with `--html`, styling the edge
that raised each follow-up question. HTML groups a question and its selected
answers in one card, with other options expandable; a card chips its state only
when that state is an exception (`open`, `rejected`, or untagged), since the
chosen answer already reads as `settled`, while a folded option writes its state
as plain text. It draws two edge styles: the gray link every dependency uses,
and the green one a settled choice gives its follow-up. The legend keys only the
symbols the picture draws, each edge key with a line sample in the stroke it
names, and a view with nothing to key draws no legend at all. This is only a
view and does not change the outline grammar. The tree is never stored as
mermaid source.
The task-start reading rule treats the appendix as reference material, read only
when that decision is in play.

## Rejection

A rejected idea is not a standalone record. Every decision's
`Alternatives considered` documents what was considered and why it lost, so
a "no" never disappears and is never re-litigated.

## Slug rules

Slugs keep ASCII letters, digits, and CJK characters. Everything else
becomes a dash. The result is capped at 80 characters.
