---
status: implemented
date: 2026-10-16
description: "Read when choosing the project instruction file or installing the Claude Code integration exception."
raised-by: human
decided-by: human
created: 2026-10-16
commit: "29211e6"
paths:
  - src/core/tool-integrations.ts
  - skills/adrkit-init/SKILL.md
  - test/commands.test.ts
  - test/integrations.test.ts
---

# ADR: 24 carry standing orders in AGENTS.md only

## Problem

The standing-orders section was carried twice: every repo pasted it into `AGENTS.md`, and Claude Code users were told to carry it in `CLAUDE.md` too — this repository dogfooded a one-line `@AGENTS.md` import as its own `CLAUDE.md`. The CLI checked both files for the section (`standingOrdersFile`), the init workflow instructed "Add or update this section in `AGENTS.md` (and `CLAUDE.md` when used)", the missing-section note named both, and tests machine-verified the twin carrier. That second carrier existed for one reason: Claude Code predated AGENTS.md support. The premise expired. Claude Code reads `AGENTS.md` natively since v2.1.277 (built-in plugin, default project-instructions setting `claude-md-or-agents-md`), and its official memory documentation directs repos whose `CLAUDE.md` holds nothing but an `@AGENTS.md` import to delete it. No other agent reads `CLAUDE.md` at all, so the twin now doubled the paste and verification surface without serving any tool.

## Decision

`AGENTS.md` is the only instruction file adr-kit recognizes, pastes into, and checks for standing orders. `standingOrdersFile` reads `AGENTS.md` alone; the init workflow and the missing-section note name it alone; tests prove the flip in both directions. This repository's `CLAUDE.md` is deleted. The `--tools claude` integration target stays: Claude Code still discovers skills and commands only under `.claude/` — its AGENTS.md support covers project instructions, not skill discovery — so the exception keeps its reason, with the stale "until Anthropic ships AGENTS.md support" rationale in the code rewritten to the verified facts.

## Alternatives considered

1. **Keep `CLAUDE.md` as a fallback carrier for Claude Code before v2.1.277** — rejected: those versions take a one-line `@AGENTS.md` import per the official migration guidance; permanently maintaining a second carrier doubled the standing-orders check, the paste instruction, and the dogfood verification to serve a shrinking version window.
2. **Also drop the `--tools claude` (`.claude/`) integration target** — rejected: the official skills documentation lists only `.claude/`-family skill locations and the memory documentation explicitly says nothing under a `.agents/` directory is read, so removing the target would cut Claude Code users off from the workflow skills and commands. Revisit when that changes.

## Consequences

### Verification

- `npm run typecheck` and `npm test` pass; the init workflow template, `skills/adrkit-init/SKILL.md`, and the standing-orders note speak of `AGENTS.md` alone, and the template/skill sync test stays green.
- `test/commands.test.ts` proves both directions: `AGENTS.md` carrying the section quiets the note; `CLAUDE.md` alone leaves it visible.
- `test/integrations.test.ts` dogfood check verifies `AGENTS.md` only, and this repository carries no `CLAUDE.md`.
- `adrkit update` refreshes this repository's installed integrations from the revised templates.

### Trade-offs

1. Repositories that pasted standing orders only into `CLAUDE.md` under the old guidance now get the missing-section note — intended: the section belongs in `AGENTS.md`, which every mainstream tool reads.
2. Claude Code sessions that cannot load `AGENTS.md` directly (versions before v2.1.277, disabled built-in plugin, the availability exceptions the official documentation lists) fall back to `CLAUDE.md`-only reading; the official remedy — a one-line `@AGENTS.md` import — remains possible but is neither created nor checked by the CLI.
3. Trigger to revisit: when Claude Code starts discovering skills and commands from `.agents/`, supersede this record and drop `--tools claude`.
