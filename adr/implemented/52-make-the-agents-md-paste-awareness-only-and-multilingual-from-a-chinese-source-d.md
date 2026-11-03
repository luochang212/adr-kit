---
status: implemented
date: 2026-11-03
description: Read when changing what adrkit asks agents to paste into AGENTS.md,
  or when wondering where the old standing-orders marker went.
raised-by: human
decided-by: human
created: 2026-11-03
paths:
  - AGENTS.md
  - src/core/tool-integrations.ts
  - test/integrations.test.ts
  - test/commands.test.ts
  - skills/adrkit-init/SKILL.md
  - README.md
  - README.zh.md
  - site/src/i18n/ui.ts
  - docs/upgrading.md
  - docs/zh/upgrading.md
---

# ADR: 52 make the AGENTS.md paste awareness-only and multilingual from a Chinese source, dropping the generation marker

## Problem

The standing-orders section an agent pastes into a user's AGENTS.md fails on
four counts observed in real use. It opens by mandating `adrkit list` at the
start of every coding, design, or review task, so agents re-run it on every
chat turn; the inventory is unbounded, scaling with the record count rather
than the task. It carries roughly twelve hundred tokens of rule text that
duplicates what the workflow skills already own, taxing every session whether
or not a decision is in play. It ships in English only, so a Chinese-language
repository pastes English prose into an otherwise Chinese file. And it ends in
the `<!-- adrkit: standing-orders <hash> -->` generation marker: machinery
from the CLI living in a user-authored file. ADR 35 made the marker opt-in and
clarified its meaning, but the file still carries it, and the drift note it
feeds rides the output of five commands.

## Decision

The paste becomes a short awareness section in the repository's language. It
names the tool and its entry commands — `adrkit list`, `adrkit show`,
`adrkit relevant` — keeps the record-worthiness bar in one line (only choices
that will guide future work; routine edits belong to Git and tests), and
points at the propose and record skills for the judgment and format. It states
nothing about when or whether an agent runs the commands; that judgment stays
with the agent. The Chinese text is the canonical
source and is kept within three hundred characters by a lint test; every other
language is a translation of it, starting with English. The `zh`/`en` registry
lives in `src/core/tool-integrations.ts`, the adrkit-init skill embeds both
sections, and it has the agent offer the one matching the repository's
language (existing AGENTS.md, README, and records decide; English when
nothing does; another language means translating the Chinese source with the
CLI invocations verbatim), pasted only with the user's agreement — the CLI
itself never writes AGENTS.md (ADR 24). If AGENTS.md already mentions adrkit
in the user's own words, the agent suggests nothing.

The generation marker and its drift note are removed outright, and nothing
replaces them. A difference between the pasted text and the shipped template
is no longer a signal, because the text is awareness-only and user-owned by
design: users are expected to translate, shorten, and rewrite it, so "differs
from template" carries no information. Template changes are announced through
release notes and the upgrade guide. The missing-section note survives as an
offer — "AGENTS.md does not mention adrkit … Optionally add the
matching-language section" — and the section detector now anchors on the
localized headings or the language-neutral `adrkit list` invocation. ADR 24
stands: AGENTS.md remains the only carrier and the CLI never rewrites it.

## Alternatives considered

- **Keep a marker, just subtler**: rejected. Any anchor the CLI plants in a
  user-authored file is the pollution this change exists to remove; the
  maintainer rejected the concept outright, not its wording.
- **Stamp the template generation into `adr/config.yaml` via a new
  agent-run command** (the one viable in-band replacement): rejected. It adds
  a command and an agent step whose omission turns the signal into false
  alarms, defending a text that no longer carries rules to go stale.
- **Derive a note from the `installed-with` version**: rejected. It fires on
  every upgrade even when the template did not change — nagging without
  information.
- **Soften the mandate to once per session**: rejected. Any frequency rule is
  still a rule; awareness-only means the agent decides whether and when.
- **Cap `adrkit list` output instead**: deferred. The inventory's unbounded
  output is the command's own concern and separable from the paste contract;
  it is not addressed here.
- **One English-only template**: rejected. Agents work in the repository's
  language; pasting English awareness into a Chinese file is the noise this
  change removes.

## Consequences

### Verification

- The adrkit-init skill, its exported `skills/adrkit-init/SKILL.md`, and the
  installed `.agents/` copies embed both language sections verbatim and carry
  no marker; `grep -r "adrkit: standing-orders"` over src, skills, .agents,
  tests, and AGENTS.md is clean.
- A lint test caps the Chinese body at three hundred code points, and every
  registry entry contains `adrkit list` (which doubles as the detector-anchor
  coupling check).
- init, update, list, instructions, and relevant never emit a drift note; the
  missing-section offer still fires for installed integrations, respects the
  `--tools none` opt-out, and never edits AGENTS.md bytes.
- The dogfooded AGENTS.md carries the canonical Chinese section verbatim;
  typecheck, the unit suite, the build, and `adrkit validate --all` pass.

### Trade-offs

- Agents that leaned on the task-start mandate consult `adr/` on their own
  judgment now. The product's answer is discovery, not obligation: the
  section makes the tool findable, and the workflow skills carry the methods
  for when a task actually touches decisions.
- The missing-section note can misfire in both directions — a user-written
  AGENTS.md that happens to name `adrkit list` silences it, and a section in
  an unshipped language without the command escapes it. Both costs are
  bounded because the note only offers; it gates nothing.
- A stale pasted section and the shipped template diverge silently now.
  Release notes and the upgrade guide own that announcement instead of a
  runtime note.
- Existing installations keep markers as inert HTML comments they can delete
  at will; the upgrade guide says so where users meet it.

