## Context

The review covered `origin/main..HEAD` (7 commits: the annotated deliberation
grammar, frontier rounds and their removal, the offline card tree, the decision
map, the marker fix, and the shared canvas). The gate was already green before
any fix — `npm run typecheck`, 217 tests, `npm run build`, and
`npm run check:upstream` all pass — so none of these findings is caught by
existing tooling. Each was reproduced by hand first; the new tests are the
reproductions turned into regression tests, and they fail on the pre-fix code
and pass after it.

## Goals / Non-Goals

**Goals:** stop the silent data loss (deliberation state, record tags), make the
grammar have exactly one meaning, make the two offline views agree, and pin the
CLI reference to real output.

**Non-Goals:** compatibility with pre-annotation record shapes. ADR 3 records
that this is a 0.x, self-use tool with no adopters and that compatibility is not
a constraint, and the shapes in question (the ` - ` reason separator, the
`(round N)` marker) were introduced by the unpushed commits under review, so no
release ever shipped them. The fix deletes them instead of tolerating them.
Also out of scope: re-deciding the override semantics, unifying the two override
helpers, restructuring the `*-view.ts` modules, and removing the Mermaid/HTML
features the review called scope creep.

## Findings, evidence, and verdicts

Reproductions ran against the real commands in throwaway git repositories.

1. **A hyphen anywhere in the line cut the reason — confirmed, fixed by
   deletion.** `- A: Postgres - it is proven [settled] (recommended)` rendered as
   text `Postgres` / reason `it is proven [settled] (recommended)`: state and
   recommendation both lost. Root cause: a fallback that scanned for the last
   ` - ` before extracting the annotations, added for records written before the
   annotated grammar — records that only exist in the unpushed commits. The fallback
   is gone; the em dash with spaces is the only separator, so a hyphen is prose
   and the regression test pins exactly that. The `(round N)` reader went the
   same way, and ADR 6's own tree was migrated off the marker (ADR 7 already
   removed it from the grammar).
2. **`supersede` and `accept` drop `tags` — confirmed, fixed.**
   `stampLifecycleMove` kept only string and number fields, so the array-valued
   `tags` fell out of the canonical-field copy, and `proposalToDecision` rebuilt
   the front matter without it. Reproduced directly, and it is visible in this
   repository: ADR 5 and ADR 6 carried tags at creation and lost them when
   superseded in `6daff41`. The map tints nodes by tag, so the loss is now
   user-visible.
3. **A title with no spaces overflows the map card — confirmed, fixed.**
   `wrap()` split on spaces only; a 30-character Chinese title was emitted as a
   single `<text class="title">` inside a fixed 248px card, and the same
   function fed Mermaid labels. Now one shared wrapper measures display width
   (wide characters count double) and splits a run that has no break
   opportunity.
4. **The `tree` samples in the CLI reference are not the command's output —
   confirmed, fixed, and now pinned.** Real `--text` output carries `Q:`/`A:`
   prefixes; real `--mermaid` output carries the root/question/option shapes,
   five `classDef` lines, and `linkStyle`. Both language versions were stale. A
   new test renders the documented outline and requires the reference to quote
   it verbatim.
5. **`adrkit tree --html --mermaid` silently preferred HTML — confirmed,
   fixed.** `graph` has always rejected conflicting formats; `tree` took the
   first truthy flag. The decision-graph spec required the error for `graph`
   only, so the tree behaviour was legal but inconsistent; the deliberation-tree
   spec now states it too.
6. **`⌘ + scroll` panned while the hint and ADR 11 promise zoom — confirmed by
   code reading, fixed.** The wheel handler tested `event.ctrlKey` only. The
   hint (`canvas-view.ts`) and `docs/cli.md` both advertised `Ctrl/⌘`, so the
   handler now accepts `metaKey` as well. No browser was available, so this is
   covered by a string assertion on the emitted script, not by a live gesture.
7. **Mermaid and the card tree disagreed about an unlock edge — confirmed by
   code reading, fixed.** Mermaid asks whether the immediate parent *node* is
   the root; the card tree asked whether the enclosing *card* is the root, so a
   follow-up raised by a settled option that lives on the root card was styled
   in Mermaid but not in HTML. The rule now keys off the source node
   (`!item.anchor && …root`). The card tree's edge paths are built at runtime,
   so this too is pinned by a script assertion rather than a DOM test.
8. **The override rule did not match its own spec — confirmed, spec corrected,
   code kept.** ADR 11's tree has a settled child and no `(recommended)`
   sibling; `adrkit tree 11 --text` reports no override and the HTML stats say
   `0 overrides`, while `spec:81` and ADR 5's prose say a settled child that is
   not the recommendation is an override. Marking it would claim the human
   overrode a recommendation the session never made, so the specification now
   states the precondition instead of the code inventing an override.
9. **`graph` invented a birth date for a record the format rejects — confirmed
   by code reading, fixed.** `created` is required by the record format and
   `validate` reports `front matter must include "created"`, yet the graph
   silently grouped such a record under its status `date`. With no compatibility
   left to serve, the view now names the invalid record instead of fabricating a
   date; both `--mermaid` and `--html` go through the same check.

## Decisions

- **No compatibility code.** Both shapes the previous revision tolerated are
  ours, unpushed, and unshipped; ADR 3 explicitly declines compatibility for
  this tool. Removing the fallback also removes the ambiguity, which is the
  actual bug: with one reserved separator, a hyphen cannot be misread.
- **Migrate our own record rather than special-case it.** ADR 6's tree carried
  two `(round 1)` markers; its Decision prose still documents what the round
  was, so dropping the markers from the appendix loses no history and keeps the
  file inside the grammar. Precedent: `3af59c1` migrated ADR 3's tree the same
  way.
- **Fix the field copy in the lifecycle helper, not in each command.** Both
  `supersede` (through `stampLifecycleMove`) and `accept` (through
  `proposalToDecision`) rebuild front matter; the missing piece is "carry a
  canonical field the move does not patch", which belongs in one place.
- **One shared text helper** (`src/core/view-text.ts`) for escaping and
  wrapping, replacing two copies of `escapeHtml` and two copies of the
  word-wrap loop. Fixing the space-less wrap in one place fixes the map, the
  card tree title, and Mermaid labels together.
- **Restore the lost tags rather than leave the records degraded.** ADR 2 makes
  these records the durable log; a field the CLI dropped is a repair of its own
  output, not a rewrite of a decision.

## Deferred, with reasons

- **`overridden` (HTML) vs `isOverride` (text/Mermaid)** still differ when a
  question's settled child is a follow-up question rather than an option, and
  `kindOf` duplicates `typeOf`. Unifying them requires deciding whether an
  answer may be a question; that is a semantics decision, not a bug fix. No
  record in this repository exercises the difference.
- **Remaining duplication** (date grouping, tag-colour assignment, control-bar
  CSS) is small and behaviour-preserving to merge; the churn is not worth it
  here. The two highest-traffic duplicates are gone with `view-text.ts`.
- **`renderDeliberationHtml` as a one-line delegator, the `*-view.ts` naming,
  and `deliberation.ts` owning grammar plus three renderers** are structure, not
  defects.
- **Mermaid labels carrying the reason, and the map's header/stats blocks** were
  called scope creep. Neither spec forbids them and the maintainer approved the
  shapes, so the spec keeps them.

## Risks / Trade-offs

- [A record written with a ` - ` reason now shows the hyphen as text] -> the
  shape was never released and the status is preserved, which is strictly better
  than losing it.
- [The doc test pins the samples verbatim] -> any renderer change now forces a
  reference update; that is the point.
- [Two fixes are asserted against the emitted script, not a live browser] ->
  recorded here as the verification boundary for the `⌘ + scroll` gesture and
  the unlock-edge rule.
