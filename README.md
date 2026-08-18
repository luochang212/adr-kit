<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README.zh.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ADR Kit

<p>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/v/adr-kit?style=flat-square&color=0e7490" alt="npm version" /></a>
  <a href="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml"><img src="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/dm/adr-kit?style=flat-square&color=0e7490" alt="npm downloads" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/adr-kit?style=flat-square&color=0e7490" alt="node" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/adr-kit?style=flat-square&color=0e7490" alt="license" /></a>
</p>

<p>
  <img src="assets/social-preview.png" alt="ADR Kit — Open Architecture Decision Records" width="100%" />
</p>

ADR Kit turns architecture decisions into plain Markdown files with a
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
npm install -g adr-kit
cd your-project
adrkit init
adrkit propose "Use SQLite for session storage"
```

`adrkit init` creates an `adr/` directory:

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
adrkit validate
adrkit accept "Use SQLite for session storage"
adrkit list
```

## Commands

```text
adrkit init [path]                    Initialize an ADR Kit repository
adrkit propose <title>                 Create a proposed decision
adrkit decide <title>                  Record an already-accepted decision
adrkit accept <name>                   Accept a proposal (assigns NNNN)
adrkit reject <name> --reason <text>   Reject a proposal
adrkit supersede <name> --by <name>    Mark an accepted decision as superseded
adrkit list [--json]                   List all records
adrkit show <name>                     Show a record
adrkit status [--json]                 Show lifecycle counts and validity
adrkit instructions [--json]           Print the next step; flag pending proposals as ready or needing work
adrkit validate [name] [--all] [--json] Validate one record or the repository
adrkit update [--tools <list>]          Rewrite AI tool integrations
adrkit config [--json]                 Print the current configuration
adrkit completion <bash|zsh|fish>      Print a shell completion script
adrkit version                         Print the version
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
  `adrkit supersede <old> --by <new>` performs the rewrite; `validate`
  checks that `NNNN` exists and is not itself superseded.

`adrkit accept` performs the mechanical rewrite a lifecycle move always
owed: `## Proposal` becomes `## Decision`, and `Acceptance criteria` plus
`Risks` are folded into `## Consequences`.

## Sources of Inspiration

ADR Kit stands on two projects, in two different roles:

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** shaped *how* the
  tool is built: an agent-first CLI whose instructions are installed as
  agent skills, a deterministic `validate`, machine-readable `--json`
  output, and a "fluid not rigid" workflow. Like OpenSpec, ADR Kit
  *steers* agents — session-visible skills rather than imposing hard phase
  gates or mandating that every change be recorded.
- **[deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)**
  gave ADR Kit *what a record is*. Its **Agent Notes** — plain Markdown
  with a `Status:` line, lifecycle folders
  (`proposed` → `implemented` → `rejected`, plus a frozen archive), and a
  `Problem` / `Proposal`·`Decision` / `Alternatives considered` /
  `Consequences` skeleton — is the direct ancestor of the ADR Kit record
  format.

Adapted, not copied. Accepted records carry a `NNNN` number, `supersede`
retires a decision in place, and `accept` mechanically rewrites a proposal
into a decision. Records are immutable once accepted: a decision record is
history, and current facts live in code, not in the record.

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

## License

[MIT](LICENSE)
