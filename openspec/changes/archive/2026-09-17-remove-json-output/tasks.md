## 1. CLI dispatch and completion

- [x] 1.1 In `src/cli.ts`, delete the `json` entry from the `parseArgs` option table, delete the `JSON_COMMANDS` set, delete the `adrkit ${surface} does not support --json` rejection, and delete the `surface` expression it fed. Restore `if (values.version)` / `if (values.help)` as unconditional short-circuits placed before the remaining `--decided-by` check. Verify: `node dist/cli.js list --json` exits 1 with `Unknown option '--json'`; `node dist/cli.js --help` and `--version` exit 0; `node dist/cli.js --help --decided-by human` prints help and exits 0; `node dist/cli.js list --decided-by human` still exits 1 with `does not take --decided-by`.
- [x] 1.2 Update the `graph` dispatch case in `src/cli.ts` to stop passing `json: values.json`, and drop `values.json` from the `list`, `status`, `instructions`, `validate`, and `config` cases. Verify: `grep -n "values.json" src/cli.ts` returns nothing.
- [x] 1.3 In `src/commands/completion.ts`, remove `--json` from every entry in `COMMAND_OPTIONS`. Verify: `node dist/cli.js completion bash | grep -- --json` and the same for `zsh` and `fish` are empty, and `bash -n` / `zsh -n` on the generated scripts pass.

## 2. Commands and core

- [x] 2.1 `src/commands/list.ts`: drop the `asJson` parameter and the JSON payload branch. Verify: default `list` output is byte-identical to before the change.
- [x] 2.2 `src/commands/status.ts`: drop the `asJson` parameter and JSON branch, keeping the `StatusResult { valid, output }` shape and the exit-code signal. Verify: `adrkit status` still exits 1 on an invalid repository.
- [x] 2.3 `src/commands/instructions.ts`: drop the `asJson` parameter and JSON branch. Verify: `adrkit instructions` prints the same next-step text.
- [x] 2.4 `src/commands/validate.ts`: drop the `asJson` parameter and JSON branch, keeping `ValidateResult { valid, output }`. Verify: `adrkit validate --all` output and exit code unchanged.
- [x] 2.5 `src/commands/config.ts`: drop the `asJson` parameter and JSON branch. Verify: `adrkit config` prints the same text.
- [x] 2.6 `src/commands/graph.ts`: remove `json` from `GraphFormatFlags`, remove the `jsonGraph` import, narrow the mutual-exclusion list to `mermaid | dot | text`, and drop the `json` dispatch branch. Delete `jsonGraph` from `src/core/graph.ts`. Verify: `grep -rn "jsonGraph" src/` returns nothing; `adrkit graph`, `--dot`, `--text` still render and `--mermaid --dot` still fails.

## 3. Tests

- [x] 3.1 `test/cli.test.ts`: delete the two `--json` cases (`rejects --json on commands that do not support it`, `rejects --json alongside --help and --version`) and delete the `--decided-by` assertions that depend on the removed `--help`/`--version` rejection; keep the cases proving `--decided-by` is required and rejected on real commands, and add a case proving `list --json` fails as an unknown option. Verify: `npm test -- test/cli.test.ts` passes.
- [x] 3.2 `test/commands.test.ts`: rewrite every `JSON.parse(listCommand(root, true))` / `statusCommand(...)` inspection to assert through `listRecords`, `parseAdrFile`, or `validateRepository`; delete the `exposes decidedBy on the JSON surface` case and keep an equivalent model-level assertion. Verify: `npm test -- test/commands.test.ts` passes with the same behavioral coverage.
- [x] 3.3 `test/graph.test.ts`: delete the `jsonGraph` / JSON-shape cases, keep and extend Mermaid, DOT, and `--text` cases to cover the edge sets the JSON case previously asserted. Verify: `npm test -- test/graph.test.ts` passes.
- [x] 3.4 `test/workflow.test.ts`, `test/validate.test.ts`, `test/supersede.test.ts`, `test/regressions.test.ts`: rewrite JSON-output inspection to model or text assertions. Verify: `npm test` passes for those files and no test imports a command with the removed `true` argument.
- [x] 3.5 `test/integrations.test.ts`: remove `--json` from any completion expectation and keep the sync check for `skills/` ↔ `src/core/tool-integrations.ts`. Verify: `npm test -- test/integrations.test.ts` passes with the fish skip unchanged.

## 4. Docs and skill mirror

- [x] 4.1 `skills/adrkit-validate/SKILL.md` and `src/core/tool-integrations.ts`: change `adrkit validate [name] [--all] [--json]` to drop `[--json]`. Verify: `test/integrations.test.ts` sync test passes.
- [x] 4.2 `docs/cli.md` and `docs/zh/cli.md`: delete the "[--json] for machine-readable output; other commands reject the flag" sentence and every `[--json]` in a command signature. Verify: `grep -rn -- "--json" docs/cli.md docs/zh/cli.md` is empty.
- [x] 4.3 `docs/workflow.md` and `docs/zh/workflow.md`: replace the "Agents can drive the same lifecycle through JSON output" block with the file-reading equivalent (agents read `adr/decisions/*.md` and run `adrkit validate`/`adrkit status` for state). Verify: `grep -rn -- "--json" docs/` is empty.
- [x] 4.4 `README.md` and `README.zh.md`: drop the `machine-readable --json` claims in the Sources of Inspiration bullet and the "Agents are first-class users" bullet, restating the interface as the files (plain Markdown + YAML front matter any agent reads directly), while keeping `machine-checkable` for `validate`. Verify: `grep -rn "machine-readable" README.md README.zh.md` is empty.

## 5. Spec and changesets

- [x] 5.1 Confirm the `decision-graph` delta in `openspec/changes/remove-json-output/specs/decision-graph/spec.md` copies the full `output formats` and `formal-only mode` requirements and contains no `--json`. Verify: `openspec validate remove-json-output --strict` passes.
- [x] 5.2 Amend `.changeset/decided-by-who-decided.md` to delete the `adrkit list --json exposes decidedBy` bullet, so the unreleased notes do not claim a surface that will not ship. Verify: `grep -n -- "--json" .changeset/decided-by-who-decided.md` is empty.
- [x] 5.3 Add a new changeset marking the removal as breaking, stating that `--json` is gone from every command and why (no consumer; the files are the interface). Verify: the changeset parses and names `adr-kit` with a breaking bump.

## 6. Verification

- [x] 6.1 Run `npm run typecheck`, `npm test`, `npm run build`, and `cd site && npm run build`; all pass with no reduction in test count beyond the deleted `--json`-specific cases.
- [x] 6.2 Sweep for stragglers: `grep -rn -- "--json\|asJson\|JSON_COMMANDS\|jsonGraph" src/ test/ docs/ README.md README.zh.md skills/` returns nothing (openspec change artifacts and archive excluded).
- [x] 6.3 Rebuild and exercise the CLI in a fresh temp repository: `decide`/`propose`/`accept`/`supersede`/`list`/`status`/`instructions`/`validate`/`graph` all behave as documented, `--json` is rejected as an unknown option, and `adrkit --help` exits 0.
- [x] 6.4 Run `openspec validate remove-json-output --strict` and confirm the change is ready to archive.
