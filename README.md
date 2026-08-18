<p align="center">
  <img src="assets/social-preview.png" alt="OpenADR — Open Architecture Decision Records" width="768" />
</p>

<p align="center">
  <strong>Open Architecture Decision Records</strong> — a lightweight ADR workflow for humans and agents.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@luochang212/openadr"><img src="https://img.shields.io/npm/v/@luochang212/openadr" alt="npm version" /></a>
  <a href="https://github.com/luochang212/OpenADR/actions/workflows/ci.yml"><img src="https://github.com/luochang212/OpenADR/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
  <a href="https://www.npmjs.com/package/@luochang212/openadr"><img src="https://img.shields.io/npm/dm/@luochang212/openadr" alt="npm downloads" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/@luochang212/openadr" alt="node" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@luochang212/openadr" alt="license" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a>
</p>

OpenADR turns architecture decisions into plain Markdown files with a
machine-checkable lifecycle: **proposed → accepted / rejected / superseded**. It borrows
the spec-driven spirit of [OpenSpec](https://github.com/Fission-AI/OpenSpec)
and the decision-record discipline of agent-native codebases: every record
must say what problem it solves, what it chose, and what it gave up.

```text
→ fluid not rigid
→ plain Markdown, no front matter
→ one decision, one file
→ built for agents and humans alike
```

## Quick start

Requires Node.js 20.19 or later.

```bash
npm install -g @luochang212/openadr
cd your-project
openadr init
openadr propose "Use SQLite for session storage"
```

`openadr init` creates an `adr/` directory:

```text
adr/
├── config.yaml      # project context and per-status rules
├── README.md        # repository conventions
├── decisions/       # accepted decisions, numbered NNNN
├── proposed/        # proposals waiting for a decision
└── rejected/        # rejected proposals, frozen
```

Fill in the proposal, then:

```bash
openadr validate
openadr accept "Use SQLite for session storage"
openadr list
```

## Commands

```text
openadr init [path]                    Initialize an OpenADR repository
openadr propose <title>                 Create a proposed decision
openadr decide <title>                  Record an already-accepted decision
openadr accept <name>                   Accept a proposal (assigns NNNN)
openadr reject <name> --reason <text>   Reject a proposal
openadr supersede <name> --by <name>    Mark an accepted decision as superseded
openadr list [--json]                   List all records
openadr show <name>                     Show a record
openadr status [--json]                 Show lifecycle counts and validity
openadr instructions [--json]           Print the next workflow step
openadr validate [name] [--all] [--json] Validate one record or the repository
openadr update [--tools <list>]          Rewrite AI tool integrations
openadr config [--json]                 Print the current configuration
openadr completion <bash|zsh|fish>      Print a shell completion script
openadr version                         Print the version
```

`<name>` resolves by title, file name, or decision number (`0001`).

## Docs

- [CLI reference](docs/cli.md)
- [Record format](docs/record-format.md)
- [Workflow](docs/workflow.md)
- [Agent skills](skills/README.md)

## Record format

Every record is plain Markdown with a three-line header:

```markdown
# ADR: Use SQLite for session storage

Status: proposed

## Problem
...
```

- **Proposed** records require `Problem`, `Proposal`, `Alternatives
  considered`, `Acceptance criteria`, and `Risks`.
- **Accepted** decisions require `Problem`, `Decision`, `Alternatives
  considered`, and `Consequences`; proposal-era headings are rejected by
  `validate`.
- **Rejected** proposals are frozen with the reason on the status line:
  `Status: rejected — <reason>`.
- **Superseded** decisions stay in `adr/decisions/` as history, with the
  replacing decision on the status line: `Status: superseded by NNNN`.
  `openadr supersede <old> --by <new>` performs the rewrite; `validate`
  checks that `NNNN` exists and is not itself superseded.

`openadr accept` performs the mechanical rewrite a lifecycle move always
owed: `## Proposal` becomes `## Decision`, and `Acceptance criteria` plus
`Risks` are folded into `## Consequences`.

## Philosophy

- **The record is the source of truth.** Code comments rot, docs drift; an
  ADR that says what was decided and what was given up stays useful.
- **Alternatives are mandatory.** A decision recorded without what it beat
  invites re-litigation.
- **Lifecycle is mechanical, not editorial.** Moving a proposal to
  accepted or rejected is a command, retiring an accepted decision via
  supersede is a command, and `validate` enforces the resulting
  shape.
- **Agents are first-class users.** The format is plain Markdown, paths are
  predictable, and every command prints machine-readable output when asked.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=luochang212/OpenADR&type=Date)](https://www.star-history.com/#luochang212/OpenADR&Date)

## License

[MIT](LICENSE)
