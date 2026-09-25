---
status: implemented
date: 2026-09-20
raised-by: human
decided-by: human
created: 2026-09-20
commit: fbfea95
tags: [grilling, governance, upstream]
---

# ADR: 4 record every grilling decision and gate upstream grilling drift

## Problem

ADR 3 made grilling first-class: it stores the design tree and terminates in
`adrkit decide`. Two gaps remained. First, the skill still told the agent to
record only decisions that cleared the ADR importance bar, and every workflow
restated that bar. But the framework's subject is *key* decisions, and a
grilling session is itself the signal that its output is key: one session
usually settles many decisions, so filtering at record time drops exactly the
material the session existed to produce. Second, the adapted method is
load-bearing and third-party. Nothing recorded which upstream revision it came
from, and nothing detected when mattpocock/skills changed it, so the adaptation
could silently rot.

## Decision

- **Grilling output is recorded without an importance filter.** A grilling
  session is the importance signal: every decision it settles is recorded. The
  bar still governs the direct, non-grill paths (`adrkit decide` and
  `adrkit propose` with no preceding session). The product's subject is key
  decision records, not architecture-class decisions only.
- **In an `adr/` repository, grill-class triggers resolve to `adrkit-grill`,
  whose terminal action is an unconditional `adrkit decide`** that must
  validate. Recording is not optional once a session reaches shared
  understanding; there is no per-session no-record escape.
- **The upstream grilling directory is pinned and hard-checked.** The current
  upstream revision of `skills/productivity/grilling` (`SKILL.md` and
  `agents/openai.yaml`) is vendored under `assets/upstream/grilling/` with a
  `MANIFEST.json` (repo, path, commit, per-file sha256). CI resolves the
  upstream path's latest commit on every push and pull request and **fails**
  when it differs from the pin. `npm run grilling:diff` shows the change; the
  adaptation is updated by hand after review, never auto-synced.

## Alternatives considered

- **Record-or-rationale per session**: rejected. It re-introduces a record-time
  filter and lets a session silently produce nothing, which is the gap this
  record closes.
- **Keep the architecture-only bar for grilling**: rejected. The framework
  records key decisions, and a deliberate interview is the strongest signal
  that its output is key.
- **A scheduled or advisory upstream check**: rejected. A periodic warning is
  read by nobody; the maintainer is present when pushing, so the check belongs
  on push and pull request, and drift must block.
- **Auto-sync the adaptation from upstream**: rejected. `adrkit-grill` is a
  deliberate adaptation, not a mirror; a machine cannot decide which upstream
  changes apply.
- **Track nothing and rely on the MIT credit**: rejected. An unpinned
  dependency with no detection is drift waiting to happen.

## Consequences

- `skills/adrkit-grill/SKILL.md` drops the record-time filter: "When to grill"
  becomes an entry, and Recording unconditionally runs `adrkit decide`.
  AGENTS.md, README, and the bilingual workflow docs split the rule into the
  grill path (always record) and the direct path (the bar applies).
- The `adr/` log grows and the task-start rule still reads every decision in
  full. Accepted: records stay terse and the design tree lives in the exempt
  `## Deliberation` appendix.
- New files: `assets/upstream/grilling/`, `tools/check-grilling-upstream.mjs`,
  and CI wiring in `.github/workflows/ci.yml`.
- The check distinguishes drift (exit 1) from an unreachable upstream (exit 2),
  so a flaky fetch is never mistaken for "no change".
- ADR 18 later changed the unconditional terminal command from `adrkit decide`
  to `adrkit record` (`adrkit propose` while an outcome is unshipped). The
  always-record rule and the upstream pin above are unchanged.
