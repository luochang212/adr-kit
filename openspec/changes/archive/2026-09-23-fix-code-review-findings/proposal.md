## Why

A whole-repository review at `709fed2` (report:
`docs/reviews/2026-09-23-whole-repository.md`) found defects that passed a
green gate (281 tests, typecheck, build, site build, pack, upstream check).
Every item below was reproduced against the built CLI before this proposal was
written.

The most serious failures are silent and user-facing:

- The override signal is computed twice and disagrees: `adrkit tree --text` and
  `--mermaid` report a human override that `adrkit tree --html` does not, so the
  provenance signal ADR 5 exists to preserve cannot be trusted.
- The `installed-with` drift notice added in `709fed2` makes `adrkit list` and
  `adrkit instructions` exit non-zero with no output when `adr/config.yaml` is
  malformed — the two commands an agent runs first, exactly when something is
  wrong.
- `npm run check:upstream` never hashes the vendored
  `assets/upstream/grilling/` files, so the pin AGENTS.md and ADR 4 promise can
  be edited undetected (proven by tampering with the vendored `SKILL.md` and
  re-running the gate, which still exits 0).

Alongside them: `supersede` silently drops non-canonical front-matter keys and
accepts a `proposed` replacement, every command silently ignores options it does
not take, and several doc/site statements contradict the shipped CLI.

## What Changes

Deliberation rendering:

- Single-source the override predicate in `src/core/deliberation.ts` on the
  option-child reading the HTML view already uses, so `--text`, `--mermaid`, and
  `--html` agree. Tighten the `deliberation-tree` wording from "its `[settled]`
  child" to its settled **option** child.
- Gate the gray "Raised by" legend key on a dependency edge the view actually
  draws (a parented, non-unlocked card), per ADR 15.
- Parse `[status]` at its grammar position instead of anywhere in the text, so a
  bracket in prose is not consumed as a state marker.
- Split a `— reason` on the first separator so a reason containing " — " does
  not swallow node text.

Lifecycle integrity:

- `adrkit supersede` SHALL validate the retiring record before rewriting it, so
  a lifecycle rewrite never silently drops a non-canonical front-matter key.
- `adrkit supersede --by` SHALL resolve to an accepted, non-superseded decision;
  a `proposed` record in `decisions/` SHALL be refused.
- Remove the unreachable `folder !== 'decisions'` guards so a draft argument
  reports the documented error instead of "no ADR matches".

Integration freshness:

- The `installed-with` notice SHALL tolerate a malformed `adr/config.yaml`
  without turning `list` or `instructions` into failures; validation stays the
  command that reports the config problem.
- Version parsing SHALL reject trailing junk (`1.2.3.4`) and stay quiet, as the
  comment and changeset already claim.

CLI option surface:

- A command SHALL reject an option it does not take rather than silently ignore
  it, starting with `--out` outside `graph`.

Governance and docs:

- `check:upstream` SHALL hash the vendored copies against `MANIFEST.json`.
- Correct `site/public/llms.txt` (only `agents` and `claude` are supported) and
  its quick start, the bilingual FAQ integration sentence, the Chinese
  `--workflows` signatures, the dead `Graph.astro` constant, the changeset
  wording, the `list` section heading, and the stale front-matter-order comment.

Tests:

- Add the missing durable-decision "Alternatives considered" test and a
  regression test for each fixed behavior.

Out of scope on purpose (recorded as not worth fixing in the review): preserving
per-item YAML comments, the ambiguous-query edge on already-invalid records,
list-style churn on hand-written configs, dead-but-harmless branches, the
duplicated `dateGroups`/`tagStyleBlocks`/`typeOf` shapes, and non-atomic
writes.

## Capabilities

### New Capabilities

- `integration-freshness`: the `installed-with` stamp, when a drift notice is
  emitted, and the tolerances (no stamp, explicit opt-out, unparseable versions)
  that keep it quiet.
- `record-lifecycle`: the invariants every lifecycle move must hold — the target
  is a valid accepted decision and a rewrite preserves every field it does not
  own.
- `cli-option-surface`: each command accepts only its own options and rejects
  the rest instead of ignoring them.

### Modified Capabilities

- `deliberation-tree`: one override predicate shared by text, Mermaid, and HTML;
  the state marker is read at its grammar position; a reason splits on the first
  em-dash separator; the dependency legend key waits for a dependency edge.

## Impact

- Core: `src/core/deliberation.ts`, `src/core/deliberation-html.ts`,
  `src/core/config.ts`, `src/core/templates.ts`, `src/core/validate.ts`.
- Commands: `src/commands/supersede.ts`, `src/commands/list.ts`,
  `src/commands/instructions.ts`, `src/cli.ts`.
- Tooling: `tools/check-grilling-upstream.mjs`.
- Docs/site: `site/public/llms.txt`, `site/src/i18n/ui.ts`,
  `site/src/components/Graph.astro`, `docs/cli.md`, `docs/zh/cli.md`,
  `docs/record-format.md`, `docs/zh/record-format.md`,
  `.changeset/detect-integration-drift.md`.
- Tests: `test/deliberation.test.ts`, `test/commands.test.ts`,
  `test/validate.test.ts`, `test/regressions.test.ts`, plus a new test for the
  upstream gate.
- No new runtime dependency. The only public behavior change beyond fixes is that
  commands reject options they already documented as command-specific; no
  supported invocation loses behavior.
- ADR: the override comparison clarifies ADR 5's spec rather than choosing a new
  direction, so no new record is required for it. If the option-surface policy is
  judged to constrain future CLI work, record it separately.
