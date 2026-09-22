# Whole-repository code review — 2026-09-23

Reviewed the repository at `709fed2` (clean tree, equal to `origin/main`) against
this repo's own contracts: `AGENTS.md`, `docs/record-format.md`, `docs/cli.md`,
`README.md`, and the accepted decisions in `adr/decisions/` (5 and 6 read as
superseded history; 7, 10, 11, 14, 15 are directly in play).

Because there is no single originating issue, the "spec" axis here is the
documented contract itself: do the docs, ADRs, and CLI reference describe what
the code actually does.

## Method and verification

Four area reviews ran in parallel (core model/validation/config; CLI/commands;
views and HTML rendering; agent integrations/docs/site), each applying the
repo's documented standards plus a Fowler code-smell baseline. Every high and
medium finding below was then reproduced independently against the locally
built CLI (`node bin/adrkit.js`), not accepted on inspection alone.

Gates, all green at the reviewed commit:

| Check | Result |
| --- | --- |
| `npm test` | 281 passed, 1 skipped (16 files) |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `cd site && npm run build` | 2 pages |
| `npm pack --dry-run` | 149 files, no stale entries |
| `npm run check:upstream` | unchanged at `85f83d3` |

## Findings, ranked

### High

**H1. The override rule is implemented twice with different semantics; `--text`
and `--mermaid` report a human override that never happened.**
`src/core/deliberation.ts:152-157` (`isOverride`) counts *any* `[settled]` child
as the chosen answer. `src/core/deliberation-html.ts:26-31` (`overridden`) counts
only settled *option* children. The two disagree whenever a question has a
settled follow-up question but no settled option:

```text
- Q: Undecided [open]
  - A: Recommended [open] (recommended)
  - Q: Related question [settled]
```

Reproduced: `tree --text` prints `(override)` and `tree --mermaid` emits
`class n1 override`, while `tree --html` draws no `Human override`. The HTML
reading matches the documented definition ("a question's answer is its
`[settled]` child; ... when that child is not it, the question is shown as an
override" — `docs/record-format.md`, *The deliberation appendix*), and the HTML
branch is the only one pinned (`test/deliberation.test.ts:285`). Duplicated Code
smell with a real behavioural split; the override signal is ADR 5's whole point.
Fix: single-source the predicate and have text/Mermaid consume it.

**H2. `site/public/llms.txt` advertises tool integrations the CLI rejects.**
Lines 62-64: "AI tool integrations (`adrkit init --tools`): claude, codex,
cursor, github-copilot, agents (generic .agents/)." The code supports only
`agents` and `claude` (`src/core/tool-integrations.ts:557-558`), and
`test/integrations.test.ts:103` asserts `codex` throws `unknown tool`. The quick
start at line 24 uses `adrkit init --tools claude`, presenting the Claude
exception as the default, contradicting `README.md` and `docs/cli.md` (default
`agents`, `claude` additive). This is the machine-readable file agents are most
likely to follow, so the cost is a failing command. Nothing in `test/` reads
`site/`.

### Medium

**M1. Regression: the new drift code makes `list` and `instructions` crash on a
malformed `adr/config.yaml`.** `src/commands/list.ts:7` and
`src/commands/instructions.ts:8` now call `readConfig` to compute the notice, but
`readConfig` throws on invalid YAML or a non-mapping top level
(`src/core/config.ts:57-67`). Before `709fed2`, `list` did not read the config
and `instructions` reported the problem through `validateRepository`.
Reproduced with `status: []`-style corruption:

```
adrkit validate   -> reports "invalid adr/config.yaml: top-level value must be a mapping" (exit 1)
adrkit status     -> reports it as a validation issue
adrkit list       -> no output, exit 1 (stderr only)
adrkit instructions -> no output, exit 1 (stderr only)
```

`list` is the command `AGENTS.md` mandates at task start. The notice lookup
should swallow config errors (no notice) and leave validation to report them.

**M2. The upstream-drift gate never hashes the vendored copies.**
`tools/check-grilling-upstream.mjs` reads only `MANIFEST.json` (line 12); the
sha256 comparison (lines 57-65) hashes freshly fetched upstream text against the
manifest. The vendored `assets/upstream/grilling/*` is read only in the
`--diff` block (line 89), whose output cannot change the exit code. So editing a
vendored copy passes `npm run check:upstream` with exit 0 while upstream is
unchanged, contradicting `AGENTS.md` ("pinned in `MANIFEST.json`; CI hard-fails
when it drifts") and ADR 4 ("per-file sha256"). The current vendored hashes do
match the manifest; the gap is that nothing enforces it. No test covers this.

**M3. `installedWithNotice` accepts malformed versions.** `SEMVER =
/^(\d+)\.(\d+)\.(\d+)/` (`src/core/config.ts:151`) is not end-anchored, so
`"1.2.3.4"` parses as `1.2.3` and produces a drift note instead of staying quiet,
contradicting the doc comment at `:162-163` and the changeset's "a version either
side cannot parse is ignored". Reproduced:
`installedWithNotice({installedWith:"1.2.3.4"}, "1.2.4")` returns a note.
Prereleases are also silently equal (`"1.2.3-beta"` vs `"1.2.3"`). No test covers
an unparseable stamp.

**M4. `supersede` silently drops unknown front-matter keys.** `stampLifecycleMove`
keeps only canonical fields and deliberately drops the rest
(`src/core/templates.ts:249-268`), justified by the comment "validate reports
those keys, so the record is fixed before any lifecycle move rewrites it"
(`:241-244`). But `supersedeCommand` never validates the target before rewriting
it (`src/commands/supersede.ts:37-45`). Reproduced: add `unknown-key: keep-me`,
confirm `adrkit validate 1` reports it, then `adrkit supersede 1 --by 2` — the
key is gone with no warning. `accept` is safe because it validates the draft
first.

**M5. Config comment preservation is overstated.** `writeListConfig`'s doc
comment says the sequence node is reused "so its style and inline comments
survive the rewrite" (`src/core/config.ts:104-108`), but the implementation
clears and recreates every item (`:117-121`). Reproduced: a block list whose
retained `agents` item carried `# keep me` comes back with the comment gone
(the test at `test/commands.test.ts:690-698` only checks a trailing comment and
an unknown key). Note `writeInstalledWithConfig` itself does preserve comments
and unknown keys correctly.

**M6. ADR 15 leftover: the gray "Raised by" legend key is drawn when only the
green unlocked edge exists.** `src/core/deliberation-html.ts:152` gates on
`cards.some(card => card.parent !== '')` — any parented card — but the client
script draws one path per parented card with `data-unlocked = card.unlocked`
(`src/core/deliberation-view.ts:292-313`), and strokes it green when unlocked.
For

```text
- Root [settled]
  - A: Chosen [settled] (recommended)
    - Q: Raised by the root option? [open]
```

the only edge is the unlocked one, yet both `Raised by` (selector
`#edges path[data-unlocked=false]`) and `Unlocked question` render. ADR 15 says
the legend lists an entry only when the picture draws the symbol. The condition
should also require a non-unlocked parented card.

**M7. The state-marker regex is unanchored and mutates prose.**
`STATUS = /\[(settled|rejected|open)\]/i` (`src/core/deliberation.ts:45`, applied
`:73-77`) treats any bracket in the node text as the status. Reproduced:
`- Note: the [open] state is documented` renders as
`- Note: the  state is documented [open]` — the prose is corrupted and the node
is mis-chipped. `docs/record-format.md` reserves `[status]` as a trailing marker;
anchor it after `(recommended)`/`— reason` are stripped.

**M8. The website FAQ misstates how integrations install.**
`site/src/i18n/ui.ts:83` (en) and `:158` (zh): "Optionally, `adrkit init --tools`
also writes skill files ... (for example `.claude/skills/`)." A plain
`adrkit init` already installs `.agents/skills/`, so integrations are not
optional; and `.claude/` requires `--tools claude`. `AGENTS.md`'s "Project
website" section requires this copy to mirror `src/core/tool-integrations.ts`.
Both languages carry the error.

**M9. Per-command option sets are unenforced; stray flags are silently ignored.**
`src/cli.ts:74-95` declares every flag globally, and the guard at `:113-119`
rejects only `--decided-by`/`--raised-by` — its own comment says "Anywhere else
the flags are a mistake, not something to ignore". Reproduced, all exit 0:
`list --tag frontend`, `status --all`, `show 3 --formal-only`,
`validate 3 --tools claude`, `graph --by 2`. The sharpest case is
`tree 3 --out file.html`: the flag is accepted but never passed to the command
(`src/cli.ts:224-233`), so the caller gets stdout instead of a file. `--out` is
graph-only in `docs/cli.md`.

**M10. "Validation failures are success signals" is not fully pinned.**
`AGENTS.md` requires tests to prove both sides for each missing requirement. No
test asserts the durable-decision rule that `## Alternatives considered` must
contain written content (`src/core/validate.ts:113-123,195`); the only coverage is
the draft path through `accept` (`test/commands.test.ts:307`). Per-missing-section
coverage of `validateDraft` is likewise thin, and there is no unparseable
`installed-with` test (M3).

### Low

| # | Finding | Evidence |
| --- | --- | --- |
| L1 | `supersede --by` accepts a `status: proposed` record in `decisions/`, creating a chain that `validate` then rejects | `src/commands/supersede.ts:27` only rejects `superseded`; parser allows `proposed` (`src/core/adr.ts:193-204`). Reproduced. `docs/cli.md` says `--by` must be an accepted decision. |
| L2 | `supersede` folder guards are dead code; a draft as `<name>` yields "no ADR matches" instead of the documented message | `supersede.ts:10-11,21-22` vs `repository.ts:14,255-288` (only `decisions`). Reproduced. |
| L3 | Changeset overclaims: says `config` compares the stamp | `.changeset/detect-integration-drift.md:8`; `config.ts` never calls `installedWithNotice` |
| L4 | `list` labels the section "Accepted" while listing superseded records | `src/commands/list.ts:20`; `docs/cli.md` says "accepted and superseded" |
| L5 | Stray-flag guard masks the unknown-command error | `adrkit bogus --decided-by human` -> "does not take --decided-by"; `cli.ts:113-119` runs before the switch |
| L6 | Query `"0"` resolves an unnumbered record | `repository.ts:269` `String(record.number ?? 0) === needle`. Reproduced. |
| L7 | Stale canonical-order comment omits `raised-by`/`decided-by`/`created`/`tags` | `src/core/templates.ts:51` vs `FRONT_MATTER_ORDER` (`src/core/adr.ts:50`) |
| L8 | Writing a list key that is absent emits block style, while `init` writes flow style | `config.ts:123` vs `repository.ts:29-38`; cosmetic reformat of hand-written configs. Reproduced. |
| L9 | Dead "missing config file" branch; docs say discovery is "the nearest `adr/` directory" | `validate.ts:248-250` is unreachable because `findRoot` requires the file (`config.ts:26-36`); `docs/cli.md:3-4` |
| L10 | Chinese CLI signatures omit `[--workflows <list>]` | `docs/zh/cli.md:14,88` vs `docs/cli.md:15,118` |
| L11 | Dead constant `const mermaid = 'adrkit graph --mermaid'` | `site/src/components/Graph.astro:14` |
| L12 | `splitReason` uses `lastIndexOf`, so a reason containing " — " swallows node text | `src/core/deliberation.ts:56-60`; first separator should split |
| L13 | Duplicated logic shapes | `graph.ts` `dateGroups` vs `graph-html.ts` `groupByDate`; `tagStyleBlocks` vs `tagColors`; `typeOf` vs `kindOf` |
| L14 | `docs.test.ts` checks no command/flag signatures, no READMEs, no `site/`, no `assets/upstream` | `test/docs.test.ts`; leaves M2/M8/L10 unguarded |
| L15 | Writes are non-atomic | `writeRecord` is a bare `writeFileSync` (`repository.ts:300-308`); `accept` writes then removes the draft. No doc claims atomicity — design note, not a breach. |

## Well done

- **No HTML/JS injection.** A crafted `</script><script>...<img onerror=...>`
  payload in a title, tag, body, deliberation text, and reason renders escaped
  in both the map and the tree; exactly one inline `<script>` block, containing
  no record content. Every interpolation routes through `escapeHtml`
  (`src/core/view-text.ts:8-15`), including SVG text, attributes, and hrefs.
- **ADR 11 is genuinely honored.** Both HTML views embed the same
  `canvas-view.ts` pan/zoom/fit/pinch controller and `relation-focus.ts` script;
  no second gesture implementation.
- **ADR 14 link resolution is correct.** `graph --out` resolves record links
  relative inside the repository and as `file://` outside, refuses a missing
  output directory, and keeps stdout-redirected maps repository-relative — all
  reproduced.
- **Offline by construction.** No CDN, `<script src>`, or `fetch` in either
  generated artifact; SVG geometry is computed at generation time.
- **Format discipline.** `FRONT_MATTER_ORDER` matches
  `docs/record-format.md` and the README; the parser/validator split is clean
  and the read-only guarantee of `validate` is tested; supersession chains are
  validated for missing targets, self-links, cycles, and non-accepted terminals.
- **Zero-dependency posture holds.** No `any`, no `@ts-ignore`, no TODOs in
  `src/`; only `yaml` plus Node builtins are imported; `src/core` stays free of
  `process.argv` and of real `console` use.
- **Integration mirror is machine-checked and real.** `integrations.test.ts`
  builds the expected skill byte-for-byte from `WORKFLOWS` and compares it to
  `skills/<name>/SKILL.md`, plus directory-set parity. Completion covers all 18
  commands and all six value-taking options.

## Notes (deliberate, not findings)

- `--json` appears in old review docs and archived OpenSpec changes; it was
  intentionally removed by the `remove-json-output` change and is now rejected
  by strict `parseArgs`. Not drift.
- `src/core/share.ts:421` contains `console.error`, but inside an embedded
  browser script string, not Node core logic.
- The four superseded/pending behaviours the previous reviews recorded
  (help/version stray-flag ordering, the supersession chain at an accepted
  terminal, completion value options, build cleaning `dist`) still hold.

## Fix triage (worth-fix)

"属实" is reproduced evidence; "值得修" is a separate judgement on trigger
probability × impact × fix cost × consequence of not fixing, with regret
asymmetry for cheap/uncertain items. Reproduction means run against the built
CLI or the real gate, not code reading alone.

| ID | 属实 | Trigger | Impact if unfixed | Fix cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| H1 | yes | low–med | med — core override signal differs per renderer | med (pick semantics, single-source, tests) | **Fix**, scheduled |
| H2 | yes | high | med — agents follow the file and hit an error | trivial | **Fix now** |
| M1 | yes | med | med — `list`/`instructions` dead on malformed config | low | **Fix now** |
| M2 | yes (tamper test) | low | med — a stated guarantee is false | low–med | **Fix**, scheduled |
| M3 | yes | very low | low — spurious notice | trivial | **Fix**, with M1 |
| M4 | yes | low | low–med — silent field loss | low | **Fix**, with supersede |
| M5 | yes | low | low — comment loss | med to fix / trivial to correct the claim | **Fix the comment only** |
| M6 | yes | high | low–med — violates ADR 15 | trivial | **Fix now** |
| M7 | yes | low–med | med — prose corruption | med | **Fix**, with renderers |
| M8 | yes | med | low — wrong site copy | trivial | **Fix now** |
| M9 | yes | med | med–low — silent wrong behaviour (`tree --out`) | med | **Fix**, separate change |
| M10 | yes | — | low–med — standing order unmet | trivial | **Fix now** |
| L1 | yes | very low | low — invalid chain via supported command | low | **Fix**, with supersede |
| L2 | yes | — | very low — dead code, wrong error | low | **Fix**, with supersede |
| L3 | yes | — | low — release note overclaims | trivial | **Fix**, with M1 |
| L4 | yes | med | very low — misleading heading | trivial | **Fix in passing** |
| L5 | yes | low | very low — wrong error message | trivial | Optional |
| L6 | yes | very low | very low — invalid-repo edge | low | **Not worth** |
| L7 | yes | — | very low — stale comment | trivial | **Fix in passing** |
| L8 | yes | low | very low — cosmetic reformat | med | **Not worth** |
| L9 | yes | — | very low — dead branch | low | **Not worth** (doc tweak optional) |
| L10 | yes | low | low — bilingual contract divergence | trivial | **Fix now** |
| L11 | yes | — | very low — dead constant | trivial | **Fix in passing** |
| L12 | yes | low | low — reason split wrong | low | **Fix**, with renderers |
| L13 | yes | — | low — pure refactor | med | **Not worth** |
| L14 | yes | — | low — unguarded docs | med | Add tests with each fix |
| L15 | yes | low | med — data integrity, but no contract | med–high | **Not worth** now |

### Batch 1 — fix now (trivial, high leverage)

1. **Drift-notice hardening** — make the `list`/`instructions` notice lookup
   tolerate a malformed config (M1), end-anchor `SEMVER` (M3), correct the
   changeset wording (L3), fix the stale heading in passing (L4, L7), and add
   regression tests (malformed config still lists; `"1.2.3.4"` stays quiet).
2. **Docs/site corrections** — `site/public/llms.txt` tool list + quick start
   (H2), the bilingual FAQ sentence (M8), the Chinese signatures (L10), the dead
   `Graph.astro` constant (L11), and the missing alternatives test (M10).
3. **ADR 15 legend** — gate the gray "Raised by" key on a non-unlocked parented
   card (M6), with the two-tree legend test the review's repro already gives.

### Batch 2 — scheduled, one coherent change each

4. **Deliberation parser/renderers** — decide the override semantics (the HTML's
   "option children only" reading is the sound one), single-source the predicate
   (H1), anchor/reorder the state marker (M7), split the reason on the first
   separator (L12), and pin all three renderers with tests.
5. **Supersede robustness** — require `--by` to be `accepted` (L1), stop the
   silent drop of unknown front-matter keys (M4), and delete the unreachable
   folder guards so a draft gets the documented error (L2).
6. **Upstream gate** — hash `assets/upstream/grilling/*` against
   `MANIFEST.json` so the vendored copies are actually pinned (M2); add a test.
7. **Per-command option validation** — reject flags a command does not take,
   starting with `--out` outside `graph` (M9).

### Not worth fixing (recorded, closed)

- **M5 code change**: preserving per-item YAML comments costs a node-rewrite
  refactor for a cosmetic loss; correct the overstated doc comment instead.
- **L6, L8, L9, L13**: edge cases on already-invalid repositories, cosmetic
  style churn, dead-but-harmless branches, and pure refactors. None clears the
  cost bar; note them and move on.
- **L15 non-atomic writes**: real but uncontracted and not currently exploited;
  if two concurrent `accept` runs ever matter, that is its own decision.

### Does anything need a refactor?

No. Every worthwhile item is a local defect — a guard, a predicate, a regex, a
doc line — and each fix lands inside the module that already owns the rule. M9
is the only one with a wider shape, and even it is a table/validation addition
in `src/cli.ts`, not a restructure.
