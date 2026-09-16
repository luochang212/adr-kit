## Why

`--json` is a template inheritance, not a decision. It entered in the project's
first commit (`e0d2ae5`, 2026-08-16, then "OpenADR") as one clause of the
founding positioning, and the README attributes it openly to OpenSpec. No
consumer justified it, and none appeared: no user, script, or CI gate reads it.

The real audience is LLM agents and humans in a terminal, for whom the mode is a
net loss: for the same `list` content it is 2.9× the bytes (1769 vs 611), nearly
all repeated keys, and `config --json` re-serializes a file that is already YAML.

It also taxes what the project sells: AGENTS.md calls the record format "the
product", yet every format change threads through the JSON surface, its tests,
and four doc surfaces — as `decided-by` did for one field. And one option
declared globally but implemented by only some commands forced `JSON_COMMANDS`,
a rejection, and the `--help`/`--version` hole of 2026-09-16.

Remove the mode and all of it.

## What Changes

- **BREAKING**: Remove the `json` boolean from the global `parseArgs` option
  table in `src/cli.ts` and the `--json` branch from all six commands (`list`,
  `status`, `instructions`, `validate`, `config`, `graph`). An undeclared option
  is rejected by `parseArgs` itself, so `--json` still fails loudly without a
  bespoke guard.
- **BREAKING**: Delete `JSON_COMMANDS` and the `adrkit <surface> does not
  support --json` rejection, including the `surface` expression and the
  no-command/`--help`/`--version` edge cases it was extended to cover on
  2026-09-16. `--help` and `--version` return to unconditional short-circuits.
  The `--decided-by` rejection stays and keeps running for real commands: it
  protects a declaration that would otherwise be silently dropped.
- **BREAKING**: Remove the `asJson` parameter and the JSON rendering branch from
  the five report commands and `graph`; delete `jsonGraph` from
  `src/core/graph.ts`. `completion.ts` stops offering `--json` for every
  command.
- `graph` keeps three outputs — `--mermaid` (default), `--dot`, `--text` — and
  its mutual-exclusion check narrows to those three.
- Reword the value proposition in `README.md`, `README.zh.md`, `docs/cli.md`,
  `docs/zh/cli.md`, `docs/workflow.md`, `docs/zh/workflow.md`, and the
  `adrkit-validate` skill pair to "the files are the interface": plain Markdown
  plus YAML front matter that any agent reads directly, with the CLI providing
  lifecycle mechanics and validation. Keep `machine-checkable` (which `validate`
  earns); drop `machine-readable --json` (which nothing earns).
- Amend the unreleased `.changeset/decided-by-who-decided.md`, whose
  `list --json` bullet becomes false once the mode is gone.
- Rewrite the test assertions that parsed command output as JSON to assert the
  record model directly (`listRecords`, `parseAdrFile`, `validateRepository`,
  the graph builder) — closer to the core and unaffected by output wording.

## Capabilities

### New Capabilities

None. Removing an output mode does not introduce behavior that deserves a new
contract, and inventing a capability to record an absence would be padding.

### Modified Capabilities

- `decision-graph`: the `output formats` requirement drops `--json` and its JSON
  shape clause; the `JSON output` scenario is removed; the `formal-only mode`
  scenario stops pairing `--json`. Mermaid, DOT, `--text`, date grouping, mined
  edges, and formal-only behavior are unchanged.

## Impact

- CLI dispatch: `src/cli.ts` (`json` option, `JSON_COMMANDS`, rejection,
  `surface`), `src/commands/completion.ts` (option table and shells).
- Commands: `src/commands/list.ts`, `status.ts`, `instructions.ts`,
  `validate.ts`, `config.ts`, `graph.ts` (`asJson` / `json` flag and branches).
- Core: `src/core/graph.ts` (`jsonGraph`).
- Skill mirror pair, machine-checked by `test/integrations.test.ts`:
  `skills/adrkit-validate/SKILL.md` and `src/core/tool-integrations.ts`.
- Tests: 34 call sites across `test/cli.test.ts`, `commands.test.ts`,
  `graph.test.ts`, `workflow.test.ts`, `validate.test.ts`, `supersede.test.ts`,
  `regressions.test.ts`, `integrations.test.ts` that read command output as
  JSON.
- Docs: `README.md`, `README.zh.md`, `docs/cli.md`, `docs/zh/cli.md`,
  `docs/workflow.md`, `docs/zh/workflow.md`.
- Spec: `openspec/specs/decision-graph/spec.md`, via the change's delta.
- Changesets: `.changeset/decided-by-who-decided.md` amended; a new breaking
  changeset added.
- Not affected: `site/`, which never mentioned `--json` (its JSON is JSON-LD and
  component data), and the record format itself.
- No dependency change; `yaml` remains the only runtime dependency.
