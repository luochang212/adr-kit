## Context

See `proposal.md` — Why. The current shape that this design has to dismantle:

- `src/cli.ts` declares `json` globally in `parseArgs`, then whitelists six
  commands in `JSON_COMMANDS` and throws for the rest. Since the rejection runs
  inside the command `try` block, it also carries the `surface` expression added
  on 2026-09-16 so `--help` and `--version` name themselves in the error.
- `list`, `status`, `instructions`, `validate`, and `config` each take an
  `asJson` parameter and build a second payload; `graph` takes a `json` flag and
  dispatches to `jsonGraph` in `src/core/graph.ts`.
- 34 test call sites across eight test files read command output through
  `JSON.parse` to inspect records.
- The claim "machine-readable `--json`" is mirrored in `README.md`,
  `README.zh.md`, `docs/cli.md`, `docs/zh/cli.md`, `docs/workflow.md`,
  `docs/zh/workflow.md`, and the `skills/adrkit-validate/SKILL.md` ↔
  `src/core/tool-integrations.ts` pair that `test/integrations.test.ts`
  machine-checks.
- `openspec/specs/decision-graph/spec.md` names `--json` in its `output formats`
  requirement and in two scenarios.

`site/` never mentioned `--json` (its JSON is JSON-LD and component data), so
the change does not reach it.

## Goals / Non-Goals

**Goals:**

- Remove every user-visible and code-level trace of the `--json` mode, including
  the guard subsystem that exists only to police it.
- Keep the two guarantees that were bundled with it but do not depend on it:
  the record format contract, and the `--decided-by` rejection.
- Leave the test suite at least as strong as before, testing behavior rather
  than serialization.

**Non-Goals:**

- No replacement machine format (TSV/porcelain) for `list` or `status`. If a
  programmatic consumer ever appears, it gets a format designed for it then.
- No change to the record format, the lifecycle commands, or `--decided-by`
  semantics.
- No change to `site/`, which is unaffected.

## Decisions

### D1: Delete the `json` option from `parseArgs` instead of keeping a guard

`parseArgs` runs with strict mode, so an option that is not declared is rejected
with `Unknown option '--json'`. Removing the declaration therefore preserves
loud failure while deleting `JSON_COMMANDS`, the custom rejection, and the
`surface` expression.

Alternatives: keep `json` declared and drop only the handlers — that reintroduces
the silent-ignore bug `54c7702` deliberately fixed; keep the guard with a
refreshed message — that maintains a subsystem for a flag with no consumer.

Trade-off: the native message is generic where the hand-written one named the
command. Accept it — the flag is being removed, and "unknown option" is the
accurate description of a flag the tool no longer has.

### D2: Keep the `--decided-by` rejection; restore `--help`/`--version` short-circuits

The two guards are not equivalent. A silently ignored `--decided-by` is a
semantic trap: `adrkit propose "x" --decided-by human` looks like it recorded a
declaration, but a draft cannot carry one and the value must be re-declared at
`accept`. A silently ignored `--json` was only a formatting mismatch, detectable
the moment the caller tries to parse the output. So the `--decided-by` rejection
stays, and with it the only remaining reason to special-case the help and
version surfaces disappears: `--help` and `--version` return to unconditional
short-circuits, undoing the 2026-09-16 extension.

Alternatives: keep the `surface` expression for symmetry — keeps code whose
remaining purpose is a message variant for a flag that is gone.

### D3: Remove `--json` from `graph` as well

A lone JSON emitter keeps the global option, the completion entry, the
heterogeneous-option problem, and the shape-drift tax alive for a consumer that
does not exist. `graph` already offers `--mermaid`, `--dot`, and `--text`, which
serve renderers and terminals respectively.

Alternatives: keep `graph --json` as an external-tool hook — premature with no
tool; keep it and drop the other five — the same subsystem for half the surface.

### D4: Replace JSON-based test inspection with direct model assertions

`listCommand(root, true)` plus `JSON.parse` tested the serializer and moved
whenever output changed. The rewrites assert the same facts through
`listRecords`, `parseAdrFile`, `validateRepository`, and `buildDecisionGraph`,
which is where the behavior lives.

Alternatives: keep a test-only JSON helper — reintroduces the surface where it
cannot be seen or reviewed.

### D5: Reword the value proposition, keeping the earned half

`machine-checkable` is earned by `validate`, which enforces the record shape;
`machine-readable --json` was inherited, not earned. The docs keep the first and
drop the second, restating the interface as the files: plain Markdown plus YAML
front matter that an agent reads directly, with the CLI supplying lifecycle
mechanics and validation.

Alternatives: delete the sentence outright — leaves the project's interface
unstated.

## Risks / Trade-offs

- [Some future consumer wants JSON] → that is exactly what "no users, no forward
  compatibility" means: build it when the consumer exists, which this project
  can afford because there is nobody to break.
- [Rewriting 34 assertions weakens coverage] → each rewrite must assert the same
  fact through the model rather than drop the check; the gate is `npm test`,
  which may only lose the cases whose subject was the removed mode itself.
- [Native `parseArgs` error is less descriptive] → accepted in D1; the stale
  `docs/cli.md` sentence promising a friendly rejection is removed with it.
- [Two unreleased changesets overlap] → amend
  `.changeset/decided-by-who-decided.md` to drop its `list --json` bullet, so the
  release notes never advertise a surface that will not ship.
- [The `decision-graph` delta could archive incompletely] → MODIFIED blocks
  carry the full updated requirement text; `openspec validate` and the archive
  step are the check.

## Migration Plan

There are no users and no records to migrate; the record format on disk is
untouched, so an existing repository keeps working. The removal is breaking only
in the CLI surface and is documented in a changeset. Rollback is a revert of the
implementation commit — no data, format, or dependency change is involved.
