## Context

See `proposal.md — Why` and the delta specs for the required behavior. This
document chooses the mechanisms.

Current state the approach builds on:

- The deliberation parser lives in `src/core/deliberation.ts` and is read by the
  text and Mermaid renderers; the HTML view in `src/core/deliberation-html.ts`
  re-derives the override and card relationships from the parsed tree.
- `src/core/config.ts` owns both the in-place YAML rewrite and the
  `installed-with` notice; `src/core/templates.ts` owns `stampLifecycleMove`.
- `src/cli.ts` declares every option globally and `src/commands/completion.ts`
  already carries a per-command `COMMAND_OPTIONS` table.
- `tools/check-grilling-upstream.mjs` compares fetched upstream content to
  `MANIFEST.json` but never reads the vendored files.

Standing constraints (AGENTS.md): `src/core/` stays free of `console` and
`process.argv`; `yaml` is the only runtime dependency; shell completion must
track the command surface; the skill templates must stay byte-identical to
`skills/*/SKILL.md`.

## Goals / Non-Goals

**Goals:**

- Make each spec requirement true with one implementation of each rule.
- Keep the fixes local: a parser rule, a predicate, a guard, a doc line.
- Pin every fixed behavior with a regression test that fails before and passes
  after.

**Non-Goals:**

- Preserving per-item YAML comments on rewrite (M5) or any item recorded as not
  worth fixing in `docs/reviews/2026-09-23-whole-repository.md`.
- Changing the view architecture, adding a command, or adding a dependency.
- Migrating any record: the repository's own records already use the canonical
  grammar.

## Decisions

**D1. One override predicate, in `deliberation.ts`, on option children.**
`isOverride(node)` becomes exported and is the only implementation: it counts a
question's *option* children (`typeOf(child) === 'option'`), requires at least
one settled option child and a recommended option child, and reports an override
when no settled option child is the recommendation. `deliberation-html.ts` drops
its `overridden(card)` and calls it. *Alternative:* keep both and align the
stricter one to the looser — rejected, because a settled follow-up question is
not an answer, and the HTML reading matches the grammar and ADR 7's "a follow-up
question is distinct from an option".

**D2. Parse the node tail in grammar order.** `parseNodeText` splits the reason
on the *first* ` — ` (D3), strips a trailing `(recommended)`, then strips a
trailing `[status]`. A bracket elsewhere stays text. *Alternative:* keep the
anywhere-match but require a word boundary — rejected; it still misreads prose
and cannot express position.

**D3. The first em dash starts the reason.** `splitReason` uses `indexOf` rather
than `lastIndexOf`, so a reason may itself contain ` — ` while the text stays
intact. *Alternative:* keep `lastIndexOf` — rejected; it moves the split into the
text and turns the reason's own separator into a paragraph.

**D4. The dependency legend key waits for a dependency edge.** The condition
becomes "at least one parented card is not an unlocked follow-up" — the same
predicate the client uses to pick the gray stroke — instead of "at least one
parented card". *Alternative:* recompute drawn edges in the browser — rejected;
the server already records `unlocked` per card so the legend and the picture
cannot disagree.

**D5. `supersede` refuses an unknown front-matter key instead of dropping it.**
Before rewriting, the command runs the same front-matter check `validate` uses
and fails naming the key, pointing at `adrkit validate`. *Alternatives:* carry
unknown keys through the rewrite — rejected; `stampLifecycleMove` deliberately
drops non-canonical keys so a version mismatch surfaces, and silently copying
them would hide it. Warn and drop — rejected as the weaker guarantee; `accept`
already refuses an invalid draft, so refusing here is symmetric.

**D6. `supersede --by` requires `accepted`, and the dead guards go.** Add an
explicit `replacement.status !== 'accepted'` check; remove the
`folder !== 'decisions'` branches that `resolveRecord` can never satisfy, since
it scans only `FOLDERS`. *Alternative:* keep the guards as defense in depth —
rejected; unreachable branches hide the real contract and mislead the next
reader.

**D7. The notice tolerates a malformed config.** Add `readConfigSafe(root)` that
returns `undefined` on a parse error; `list` and `instructions` call it only for
the notice, so a broken `adr/config.yaml` cannot turn either command into a
failure. `validate` keeps the throwing read and reports the error. *Alternative:*
catch at each call site — works, but centralizing keeps one policy for the same
question.

**D8. Version parsing is end-anchored and prerelease-blind.** `SEMVER` becomes
`/^(\d+)\.(\d+)\.(\d+)$/` on the trimmed value; anything else, including
`1.2.3.4` and `1.2.3-beta`, yields no notice. *Alternative:* a full semver
parser — rejected; there is no dependency for it and the stamp is always a plain
`x.y.z` the CLI writes, so an odd value means the file was edited and staying
quiet is the honest response.

**D9. One option table, in core, shared by the CLI and completion.** Add
`src/core/cli-options.ts` exporting the command list, each command's allowed
options, and the value-taking set; `cli.ts` uses `parseArgs({ tokens: true })` to
learn which options were supplied and rejects any outside the command's set;
`completion.ts` reads the same table instead of keeping its own copy.
*Alternatives:* validate against the table already in `completion.ts` — rejected,
because a command module would then define the CLI contract; a second table in
`cli.ts` — rejected as the duplication this review flagged.

**D10. The upstream gate checks the vendored files locally, before the network.**
Hash each `assets/upstream/grilling/<file>` against `MANIFEST.json` first and
exit 1 on a mismatch; only then fetch upstream. *Alternative:* check the vendored
copy inside the existing drift branch — rejected; that branch only runs after a
network round trip, so a tampered local file could still pass offline.

**D11. Docs and site are mechanical corrections.** `site/public/llms.txt` lists
`agents` and `claude` only and its quick start uses the default `adrkit init`;
the bilingual FAQ says plain `init` installs `.agents/skills/` and `--tools claude`
adds `.claude/`; the Chinese signatures gain `[--workflows <list>]`; the stale
front-matter-order comment in `templates.ts` is corrected to match
`FRONT_MATTER_ORDER`; the dead `Graph.astro` constant is removed; the changeset
drops the claim that `config` compares the stamp; the `list` heading becomes
"Decisions".

## Risks / Trade-offs

- Refusing `supersede` on an unknown key can block retiring a record in an
  already-invalid repository → the error names the key and points at
  `adrkit validate`; fixing the key is one edit.
- Reinterpreting the status marker can change how an existing tree renders if it
  placed `[status]` non-canonically → the repository's own records are canonical
  and the existing grammar scenarios are pinned; the regression test covers both
  positions.
- Rejecting stray options is a behavior change for anyone relying on a silently
  ignored flag → only options already documented as command-specific are
  rejected, and the changeset calls it out as a fix.
- End-anchoring `SEMVER` stays quiet on a prerelease stamp → accepted per the
  documented tolerance; the CLI only ever writes plain `x.y.z`.
- Moving the option table into core touches completion, which AGENTS.md requires
  to track the command surface → the existing completion tests and the new
  rejection tests both read the shared table, so they cannot drift apart.

## Migration Plan

No data or record migration. Ship as one changeset (a patch/minor describing the
fixes); roll back by reverting the commit. Run `npm test`, `npm run
typecheck`, `npm run build`, `cd site && npm run build`, and
`npm run check:upstream`; the new tests must fail on `709fed2` and pass after.
