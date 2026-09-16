# Record Format

Every ADR is YAML front matter followed by a Markdown body:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
decided-by: human | agent
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

Front matter fields are written in the order `status`, `date`, `decided-by`,
`created`, `commit`, `superseded-by`, `reason`, `tags`; only the fields that
apply are present. `commit` is the short git hash the decision was recorded
against, stamped automatically when the repository is under git.
`superseded-by` is required on superseded decisions and forbidden otherwise.
Unknown fields are reported by `validate`.

The `date` field records when the current status was reached. The CLI
stamps it at every lifecycle move (`decide`, `accept`, `supersede`), so it
is machine-written, never hand-maintained. `created` is the birth date,
stamped once at creation and never re-stamped, so the time axis survives
later lifecycle moves. `tags` is an optional list of kebab-case keywords
(for example `frontend`, `execution-layer`) that `adrkit graph` uses to
group and filter decisions by theme; `validate` checks their shape but
never requires them.

## Human or agent: `decided-by`

`decided-by` is `human` or `agent` and is required on accepted and
superseded decisions; a draft carries no value, and `accept` refuses to
promote one that does. `decide` and `accept` require the caller to declare it with
`--decided-by human|agent`; `propose` never writes it, and `supersede`
preserves the original value.

`human` means a person determined the direction: they stated the choice, or an
agent proposed one and the person changed it into what actually shipped — or the
person made the choice earlier and an agent is only now recording it. `agent`
means the direction came from the agent's own judgment. A person simply letting
an agent's proposal through without engaging with the choice does not move the
source to `human`: the record stays `agent`, and the body is where you say they
approved it. The field answers one question — where the choice came from, that
is, who originated it rather than who ran the command — so it
carries a single value and is never co-signed. Who proposed, who redirected, and
who approved belong in `## Decision` as prose, not in the front matter. When the
writer cannot tell which value applies, the workflow is to ask before recording.

The value is a declaration, not an observation. The CLI neither infers nor
verifies it: no environment, terminal, or session marker can reveal who chose,
so the command asks the caller and records the answer. The declaration is
weaker evidence than the observed `date` and `commit` fields, and it
cannot establish who independently chose or approved a decision. It is defeated
by a careless or false declaration, which leaves no trace any check can detect,
and by editing the file afterwards, which changes the value freely. Likewise,
`accepted` means the decision is
formally recorded, not that a human has reviewed it. Git records commit
identity separately.

`validate` is read-only: it reports a missing or unknown `decided-by` and
never writes one, because the value is a declaration only the caller can make.

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

`validate` checks that the referenced number exists and is not itself
superseded. Superseded records stay in `adr/decisions/` as frozen history.

## Rejection

A rejected idea is not a standalone record. Every decision's
`Alternatives considered` documents what was considered and why it lost, so
a "no" never disappears and is never re-litigated.

## Slug rules

Slugs keep ASCII letters, digits, and CJK characters. Everything else
becomes a dash. The result is capped at 80 characters.
