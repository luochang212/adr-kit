## 1. Deliberation parser and renderers

- [x] 1.1 Export one `isOverride(node)` from `src/core/deliberation.ts` that counts only option children (`typeOf(child) === 'option'`), and call it from `src/core/deliberation-html.ts` in place of the local `overridden(card)`; verify `adrkit tree --text`, `--mermaid`, and `--html` on the settled-follow-up fixture all report no override (D1, H1)
- [x] 1.2 Rework `parseNodeText`/`splitReason` to split the reason on the first ` — `, strip a trailing `(recommended)`, then a trailing `[status]`; verify a node reading `- A: Use Postgres [rejected] — proven at scale — and cheap` yields text `Use Postgres`, state `rejected`, reason `proven at scale — and cheap` (D2, D3, L12)
- [x] 1.3 Verify `- Note: the [open] state is documented` renders its full text with no recorded state, and add both regression cases to `test/deliberation.test.ts` (D2, M7)
- [x] 1.4 Gate the gray "Raised by" legend entry on a parented card that is not an unlocked follow-up; verify a tree whose only parented card is unlocked renders the frontier key and no dependency key (D4, M6)
- [x] 1.5 Tighten `docs/record-format.md` and `docs/zh/record-format.md` to say a question's answer is its settled option child and the first em dash starts the reason; verify the wording matches the new scenarios

## 2. Lifecycle integrity

- [x] 2.1 Make `supersede` run the front-matter-extras check before rewriting and fail naming the key, pointing at `adrkit validate`; verify a record carrying `unknown-key: keep-me` is refused and left byte-identical (D5, M4)
- [x] 2.2 Require `replacement.status === 'accepted'` in `supersede`, and remove the unreachable `folder !== 'decisions'` branches; verify `--by` pointing at a `proposed` record in `decisions/` is refused and an accepted one proceeds (D6, L1, L2)
- [x] 2.3 Add `test/supersede.test.ts` cases for both refusals and for a canonical-field-preserving success; verify they fail on `709fed2` and pass after

## 3. Integration freshness

- [x] 3.1 Add `readConfigSafe(root)` to `src/core/config.ts` and use it for the notice in `src/commands/list.ts` and `src/commands/instructions.ts` only; verify a malformed `adr/config.yaml` still lets `list` and `instructions` succeed while `validate` reports the config error (D7, M1)
- [x] 3.2 End-anchor the version regex in `config.ts`; verify `installedWithNotice({installedWith:'1.2.3.4'}, '1.2.4')` and `'1.2.3-beta'` vs `'1.2.3'` both return no notice (D8, M3)
- [x] 3.3 Add regression tests for the malformed-config path and the unparseable stamp to `test/commands.test.ts`; verify they fail on `709fed2` and pass after

## 4. CLI option surface

- [x] 4.1 Add `src/core/cli-options.ts` with the command list, each command's allowed options, and the value-taking set; refactor `src/commands/completion.ts` to read it and verify the existing completion tests stay green (D9, M9)
- [x] 4.2 Validate supplied options in `src/cli.ts` using `parseArgs({ tokens: true })` against the shared table, rejecting any option outside the command's set; verify `tree --out`, `list --tag`, and `decide --tools` each exit non-zero naming the option while `graph --out` still writes the file (D9, M9)
- [x] 4.3 Add the rejection cases to `test/regressions.test.ts`; verify they fail on `709fed2` and pass after

## 5. Upstream gate

- [x] 5.1 Hash each `assets/upstream/grilling/<file>` against `MANIFEST.json` before the network fetch and exit 1 on a mismatch; verify appending a byte to the vendored `SKILL.md` then restoring makes `npm run check:upstream` exit 1 while upstream is unchanged (D10, M2)
- [x] 5.2 Add a test that spawns the gate against a temp copy with a tampered vendored file and asserts exit 1 without requiring network; verify it passes while the current gate would exit 0

## 6. Docs and site

- [x] 6.1 Correct `site/public/llms.txt` to list only `agents` and `claude` and use plain `adrkit init` in the quick start; verify no unsupported tool name remains (H2)
- [x] 6.2 Rewrite the integration sentence in `site/src/i18n/ui.ts` for both languages so plain `init` installs `.agents/skills/` and `--tools claude` adds `.claude/`; verify English and Chinese agree (M8)
- [x] 6.3 Add `[--workflows <list>]` to the `init` and `update` signatures in `docs/zh/cli.md`; verify parity with `docs/cli.md` (L10)
- [x] 6.4 Correct the stale canonical-order comment in `src/core/templates.ts` to match `FRONT_MATTER_ORDER`, rename the `list` section heading to "Decisions", and drop the `config` comparison claim from `.changeset/detect-integration-drift.md`; verify each matches the code (L7, L4, L3)
- [x] 6.5 Remove the unused `mermaid` constant from `site/src/components/Graph.astro`; verify `cd site && npm run build` still builds 2 pages (L11)

## 7. Tests and full verification

- [x] 7.1 Add a `test/validate.test.ts` case proving a durable decision whose `## Alternatives considered` has no written alternative fails, completing the both-sides rule in AGENTS.md (M10)
- [x] 7.2 Add a changeset describing the fixes; verify it is minor/patch-appropriate and covers the CLI behavior change
- [x] 7.3 Run `npm test`, `npm run typecheck`, `npm run build`, `cd site && npm run build`, and `npm run check:upstream`; verify all pass
- [x] 7.4 Run the new tests in a worktree at `709fed2` and verify each fails there and passes on the fix, one per behavior (red-to-green evidence for the review's findings)
