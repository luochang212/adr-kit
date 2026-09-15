# Record Format

Every ADR is YAML front matter followed by a Markdown body:

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
decided-by: human | machine
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

## Human or machine: `decided-by`

`decided-by` is `human` or `machine` and is required on accepted and
superseded decisions; a draft carries no value, and `validate` rejects one
that does. The CLI stamps it from the environment the command runs in:
`decide` and `accept` write it, `propose` never does, and `supersede`
preserves the value the record already had, because the field states who
made the decision and not who last rewrote the file. There is no flag to set
it.

Read it as an inferred stamp, weaker evidence than the observed `date` and
`commit` fields. It proves nothing: clearing or masking the session markers,
invoking `adrkit` through a wrapper, or editing the file afterwards all
defeat it. Its job is to end accidental mislabeling, so a record no longer
looks identical whether a person authorized it or an agent recorded it on its
own. Identity is not recorded here; git owns who committed, and this field
covers only the axis git cannot answer, because an agent session commits as
the human user. `validate` never back-fills the field: a record that predates
it reports a missing `decided-by` until a person supplies the value they know
to be true.

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
