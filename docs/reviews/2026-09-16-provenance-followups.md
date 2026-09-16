# Provenance review follow-ups — 2026-09-16

Acted on the review recorded in `2026-09-16-decision-provenance.md`. Every item
below was reproduced against the built CLI on `3bbb66a` before anything was
edited, then fixed, then pinned as a regression test: ten of the new tests fail
on `3bbb66a` and pass after, one per behavioral fix. A further test added for
this work — the steer copy in `init` and `propose` — passes on both sides and is
guard coverage rather than a red-to-green proof. Fixes are local; no
refactoring was warranted, since each defect is a wrong line, a wrong word, or a
stale build artifact rather than a shared foundation.

| Finding | Evidence | Disposition |
| --- | --- | --- |
| `--help` and `--version` swallowed a stray option | `adrkit --help --decided-by human`, `adrkit --version --decided-by human`, and `adrkit init --help --decided-by human` all printed and exited 0: the rejection ran after the early returns | Both rejection checks moved above the early returns in `src/cli.ts`; the `--json` check also had this hole (not in the original list) and now fires with no command too |
| `list --json` omitted `decidedBy` | A decision recorded with `--decided-by agent` produced a payload with no `decidedBy` key, while `rejectionReason` and `supersededBy` were there | Key added beside the other lifecycle fields; drafts still carry none |
| `instructions` preset a human declaration | The ready-to-accept line read `adrkit accept <draft> --decided-by human` with no agent hint, unlike the other two steer sites | Line now reads `--decided-by <human\|agent>`, so the caller must pick |
| Stale `dist/core/execution-env.*` would ship | The deleted module's compiled files were still on disk (timestamped 18:23, before the deletion commit) and `npm pack --dry-run` listed all four | `build` now removes `dist` before `tsc`; the tarball lists zero `execution-env` entries |
| The reference claimed `validate` rejects the field on a draft | `validate --all` returned `OK` and exit 0 for a draft carrying `decided-by: human`; only `accept` reports it | Wording corrected in the spec and both references. Behavior left alone: a draft is a work in progress and scanning drafts would fail a repository for every half-written proposal |
| Migration scaffolding for records that cannot exist | The requirement, its "migration is documented" scenario, and one line in each README describe adopters this format never had; the retired `machine` value never shipped | Replaced with a lean "Validation never writes the field" requirement; the release-note clause and both README clauses deleted |
| The two-value set was encoded in three places | `src/core/adr.ts`, `src/cli.ts`, and `src/commands/completion.ts` each spelled `human`/`agent` | `DECIDED_BY_VALUES` and `isDecidedBy` live in core; the parser, the CLI prompt, and completion all read from there |
| Completion registered value options as flags | `--tag`, `--tools`, `--workflows`, `--by`, `--reason` had no `=` or argument slot in zsh and no `-x` in fish, so each shell offered the option list where the CLI waits for a value; zsh had no default branch | zsh specs carry an argument slot, fish carries `-x`, a fallback arm covers commands outside the table, and bash stops re-offering options after a value option |
| The changeset described a deletion that never happened | `git log --all -S interactiveTerminal` is empty | "terminal detection" removed from the changeset; the probe and marker list remain the honest description |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | pass |
| Tests | `npm test` | 177 passed / 1 skipped |
| Red on `3bbb66a` | same tests in a worktree at that commit | 10 failed — one per fix above, each failing on the old behavior; 74 passed, including the steer guard |
| Build and pack | `npm run build`, `npm pack --dry-run` | build passes; zero stale entries |
| Site | `cd site && npm run build` | 2 pages built |

## Verification boundary

- Boolean-option completion in zsh is not observable through the zpty harness:
  probing `adrkit list --h`, `--j`, and `adrkit validate --a` left the buffer
  unchanged, while options with an argument spec (`--decided-by=`) do complete.
  The value-option and fallback changes are therefore pinned by string
  assertions plus the two probes the harness can observe; the unobserved part is
  the insertion of a valueless option, not its declaration.
- Fish completion is asserted as generated text; the real-Fish test stays
  skipped here because Fish is not installed.
- The VHS demo was not re-recorded: the tape's command is unaffected by these
  fixes, so its transcript stands.

## Left alone on purpose

- Completion was corrected in place rather than narrowed to `--decided-by`. The
  table already existed and its wrong specs were the defect; a narrower table
  would have removed the surface rather than fixed it.
- The field name stays `decided-by`, `supersede` still cannot take a new
  declaration, and no configuration default is offered: the review's "do not
  touch" list still holds, and each of those was a deliberate decision in
  `42eb97a` rather than drift.
