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

ADR Kit stores architecture decisions as plain Markdown across four lifecycle directories. It is an independent, agent-friendly decision-record tool: proposals are unshipped, implemented records describe shipped choices, rejections retain their rationale, and archives preserve frozen history.

- Plain Markdown and YAML front matter
- One choice per file, with explicit alternatives
- Stable ADR numbers assigned only when work ships
- Built for agents and humans

## Quick start

Requires Node.js 20.19 or later.

```bash
npm install -g adr-kit
cd your-project
adrkit init
adrkit propose "Use SQLite for session storage"
# Fill the proposal; after the work ships:
adrkit implement "Use SQLite for session storage" --raised-by human --decided-by human
adrkit validate
```

For an architectural choice already shipped, use `adrkit record "<title>" --raised-by human --decided-by human` instead.

```text
adr/
├── config.yaml
├── README.md
├── proposed/       # dated, unnumbered, unshipped
├── implemented/    # numbered, shipped, active guidance
├── rejected/       # dated, unnumbered, declined with reason
└── archived/       # numbered, frozen history
```

An uncommitted proposal is a local working-tree draft; committing it shares it. There is no separate `.drafts/`. A choice settled by discussion remains proposed until shipped. `adrkit reject --reason` retains every formal rejection. `adrkit supersede --by` archives a fully replaced implemented decision; `adrkit archive --reason` retires one whose current behavior has another authoritative owner. Never archive by age or quota. Partial replacement leaves still-relevant guidance active. Both moves seal the archived file in `adr/archived/MANIFEST.json`; `adrkit validate` checks the seal and `adrkit validate --base <git-ref>` proves the archive only grows.

## Tell your agent

Add the [reading rule](docs/workflow.md#read-decisions-before-coding) to `AGENTS.md` or `CLAUDE.md`. At task start, run `adrkit list`, read relevant implemented records in full, check relevant proposed and rejected records, and use archives for history. Do not filter by title alone. The `adrkit-init` skill guides setup; `adrkit update` refreshes installed skills. Before creating a record, compare it with active records covering the same choice and resolve a full replacement with `adrkit supersede --by` in the same change; when shipping or reviewing, use the `adrkit-implement` and `adrkit-review` skills to keep realization facts aligned with shipped code.

## Commands

```text
adrkit init [path] [--tools <list>] [--workflows <list>]
adrkit propose <title>
adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>
adrkit record <title> --raised-by <human|agent> --decided-by <human|agent>
adrkit reject <name> --reason <text>
adrkit archive <name> --reason <text>
adrkit supersede <old> --by <new>
adrkit list
adrkit show <name>
adrkit status
adrkit instructions
adrkit validate [name] [--all] [--base <git-ref>]
adrkit update [--tools <list>] [--workflows <list>]
adrkit config
adrkit graph [--mermaid|--dot|--text|--html] [--formal-only] [--tag <tag>] [--out <path>]
adrkit tree <name> [--mermaid|--text|--html]
adrkit completion <bash|zsh|fish>
adrkit version
```

By default, integrations install into `.agents/`. Pass `--tools claude` for additional `.claude/` copies, or `--tools none` to install none. `--workflows` selects a subset such as `init,propose,implement,validate`.

## Record format

A shipped decision is `adr/implemented/N-slug.md`:

```markdown
---
status: implemented
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-24
tags: [storage]
---

# ADR: 1 Use SQLite for session storage

## Problem

...

## Decision

...

## Alternatives considered

...

## Consequences

...
```

Proposals use dated filenames and `Problem`, `Proposal`, `Alternatives considered`, `Acceptance criteria`, and `Risks`. The CLI stamps `date` on lifecycle moves; `created` preserves the birth date. `raised-by` and `decided-by` declare who introduced and settled a shipped choice, not who ran the command or authorized deployment. The CLI cannot verify shipping or provenance. `tags` remain the thematic classification; no class directory is needed. `adrkit validate` checks all four folders; fresh templates intentionally fail until filled.

An implemented record may refresh factual paths, symbols, or defaults, but not rewrite the choice or rationale into another decision. A changed choice needs a new record and relationship. Full supersession stamps `superseded-by: N` and moves the old record to `archived/`. Archived records keep their numbers and are historical, not current authority. The graph includes numbered history; `## Deliberation` optionally preserves the design tree.

See [record format](docs/record-format.md), [workflow](docs/workflow.md), and [CLI reference](docs/cli.md).

## Sources of inspiration

[DeepSeek Harness Agent Notes](https://github.com/deepseek-ai/deepseek-harness) inspired the lifecycle directories and the distinction between proposed, implemented, rejected, and archived. ADR Kit keeps its own provenance fields, numbered decisions, validation, deliberation tree, and graph. OpenSpec is not part of ADR Kit's runtime or governance model.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT.
