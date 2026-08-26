<div align="right">
  <a title="English" href="https://github.com/luochang212/adr-kit/blob/main/README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="https://github.com/luochang212/adr-kit/blob/main/README.zh.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ADR Kit

<p>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/v/adr-kit?style=flat-square&color=0e7490" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/dm/adr-kit?style=flat-square&color=0e7490" alt="npm downloads" /></a>
  <a href="https://github.com/luochang212/adr-kit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/adr-kit?style=flat-square&color=0e7490" alt="license" /></a>
  <a href="https://zread.ai/luochang212/adr-kit"><img src="https://img.shields.io/badge/%E2%80%8B-zread-0e7490?style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff" alt="zread" /></a>
  <a href="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml"><img src="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
</p>

<p>
  <img src="./assets/readme-banner.png" alt="ADR Kit" width="100%" />
</p>

ADR Kit turns architecture decisions into plain Markdown files with a
machine-checkable lifecycle. Decisions are durable records
(**accepted / superseded**); proposals are ephemeral drafts that either become
a decision or vanish. It borrows the spec-driven spirit of
[OpenSpec](https://github.com/Fission-AI/OpenSpec)
and the decision-record discipline of agent-native codebases: every record
must say what problem it solves, what it chose, and what it gave up.

- fluid not rigid
- plain Markdown
- one decision, one file
- built for agents and humans alike

## Quick start

Requires Node.js 20.19 or later.

```bash
npm install -g adr-kit
cd your-project
adrkit init
adrkit decide "Use SQLite for session storage"
```

`adrkit init` creates an `adr/` directory:

```text
adr/
├── config.yaml      # project context and per-status rules
├── README.md        # repository conventions
├── .gitignore       # keeps adr/.drafts/ out of git
└── decisions/       # decisions, numbered N, immutable history
```

Proposals are ephemeral drafts in `adr/.drafts/`: `adrkit propose` creates
one, `adrkit accept` promotes it to a numbered decision, and `adrkit reject`
discards it without leaving a record. Rejection is recorded in a decision's
`Alternatives considered`, never as a standalone record.

Fill in the decision, then:

```bash
adrkit validate
adrkit list
```

## Wire in your agent

Paste this into any AI coding agent to record key decisions automatically:

```text
Use github.com/luochang212/adr-kit in this repository to automatically record key architecture decisions.
```

## Commands

```text
adrkit init [path] [--tools <list>]     Initialize an ADR Kit repository
adrkit decide <title>                   Record an already-made decision (default path)
adrkit propose <title>                  Create an ephemeral proposal draft
adrkit accept <name>                    Promote a draft to a decision (assigns N)
adrkit reject <name> [--reason <text>]  Discard a draft (leaves no record)
adrkit supersede <name> --by <name>     Mark an accepted decision as superseded
adrkit list [--json]                    List decisions and pending drafts
adrkit show <name>                      Show a decision or draft
adrkit status [--json]                  Show lifecycle counts and validity
adrkit instructions [--json]            Print the next step; flag pending drafts as ready or needing work
adrkit validate [name] [--all] [--json] Validate one record or the repository
adrkit update [--tools <list>]          Rewrite AI tool integrations
adrkit config [--json]                  Print the current configuration
adrkit graph [--mermaid|--dot|--json] [--formal-only]
                                        Emit the decision relationship graph
adrkit completion <bash|zsh|fish>       Print a shell completion script
adrkit version                          Print the version
```

> [!IMPORTANT]
> Integrations install into the open [`.agents/`](https://agents.md/) standard
> by default - one set of skills and slash commands every mainstream agent
> reads. Claude Code is the one holdout: it even [closed the AGENTS.md support
> request](https://github.com/anthropics/claude-code/issues/6235), and Shopify's
> CEO [publicly threatened to ban it over this](https://thenewstack.io/shopify-claude-code-agentsmd/).
> If your team uses Claude Code, pass `--tools claude` to also install
> `.claude/` copies - an exception we carry until Anthropic adopts the standard.

`<name>` resolves by title, file name, or decision number (`1`).

## Docs

| Document | Content |
| --- | --- |
| [CLI reference](https://github.com/luochang212/adr-kit/blob/main/docs/cli.md) | Command reference with arguments and `--json` output |
| [Record format](https://github.com/luochang212/adr-kit/blob/main/docs/record-format.md) | ADR file format and validation rules |
| [Workflow](https://github.com/luochang212/adr-kit/blob/main/docs/workflow.md) | Lifecycle from proposal to decision |
| [Agent skills](https://github.com/luochang212/adr-kit/blob/main/skills/README.md) | Agent skills that drive the `adrkit` CLI |

## Record format

Every record is YAML front matter followed by a Markdown body:

```markdown
---
status: accepted
date: 2026-08-19
commit: abc1234
---

# ADR: 1 Use SQLite for session storage

## Problem
...
```

The `date` field records when the current status was reached; the CLI
stamps it at every lifecycle move, alongside the git `commit` the decision
was recorded against. Decisions are immutable history; the current facts
live in code, not in the record.

- **Decisions** (`adr/decisions/N-slug.md`) are `accepted` or `superseded`
  and require `Problem`, `Decision`, `Alternatives considered`, and
  `Consequences`; proposal-era headings are rejected by `validate`.
- **Drafts** (`adr/.drafts/YYYY-MM-DD-slug.md`) are ephemeral proposals with
  `status: proposed`, require `Problem`, `Proposal`, `Alternatives
  considered`, `Acceptance criteria`, and `Risks`, and are never checked by
  `validate` - `adrkit accept` validates a draft right before promoting it.
- **Rejected** ideas are not standalone records: a decision's
  `Alternatives considered` documents what was considered and why it lost.
- **Superseded** decisions stay in `adr/decisions/` as history, with the
  replacing decision in the front matter: `status: superseded` plus
  `superseded-by: N`.
  `adrkit supersede <old> --by <new>` performs the rewrite; `validate`
  checks that `N` exists and is not itself superseded.

`adrkit accept` performs the mechanical rewrite a lifecycle move always
owed: `## Proposal` becomes `## Decision`, and `Acceptance criteria` plus
`Risks` are folded into `## Consequences`.

## Compatibility with other tools

ADR Kit owns one directory - `adr/` - and reads and validates only its own
files, so it can share a repository with any tool that does not collide
with that layout. Its agent skills are namespaced per tool (`adrkit-*`),
and `adrkit update` only rewrites its own integrations.

| Tool | Role | Relationship |
|---|---|---|
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | Forward-looking: specifies what to build | Complementary - specs vs records |
| [Changesets](https://changesets.dev) | Release tooling: versions and changelog | Orthogonal - cite the ADR number in the changeset body |

When a change makes an architectural decision that should outlive the
change, record it as an ADR.

## Sources of Inspiration

ADR Kit stands on two projects, in two different roles:

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** shaped *how* the
  tool is built: an agent-first CLI whose instructions are installed as
  agent skills, a deterministic `validate`, machine-readable `--json`
  output, and a "fluid not rigid" workflow. Like OpenSpec, ADR Kit
  *steers* agents: session-visible skills rather than imposing hard phase
  gates or mandating that every change be recorded.
- **[deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)**
  gave ADR Kit *what a record is*. Its **Agent Notes**: plain Markdown
  with a `Status:` line, lifecycle folders
  (`proposed` → `implemented` → `rejected`, plus a frozen archive), and a
  `Problem` / `Proposal`·`Decision` / `Alternatives considered` /
  `Consequences` skeleton: that is the direct ancestor of the ADR Kit record
  format.

Adapted, not copied. Accepted records carry a `N` number, `supersede`
retires a decision in place, and `accept` mechanically rewrites a proposal
into a decision. Records are immutable once accepted: a decision record is
history, and current facts live in code, not in the record.

## Philosophy

- **The record is the source of truth.** Code comments rot, docs drift; an
  ADR that says what was decided and what was given up stays useful.
- **Alternatives are mandatory.** A decision recorded without what it beat
  invites re-litigation.
- **Lifecycle is mechanical, not editorial.** Promoting a draft and retiring
  an accepted decision are commands (`accept`, `supersede`), and `validate`
  enforces the resulting shape.
- **Agents are first-class users.** The format is plain Markdown, paths are
  predictable, and agent-facing commands print machine-readable `--json`
  output; the rest reject the flag instead of silently ignoring it.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

[MIT](https://github.com/luochang212/adr-kit/blob/main/LICENSE)
