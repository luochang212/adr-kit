---
status: accepted
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: 02536cc
tags: [visualization, deliberation-tree, information-density]
---

# ADR: 15 Chip a deliberation state only as an exception, and key the legend to the picture

## Problem

The card tree printed a state chip (`settled`, `open`, `rejected`, or
`unrecorded`) on every card, and the legend listed `● Human override` on every
page. In a recorded tree each question is `[settled]` — that is what the
appendix means by a finished session — so the chip showed the same word on
every card, and the override key asked the reader to look for a marker that
often did not exist. A label whose value is constant carries no information,
and both the chip and the legend spent attention on the one state that is the
default. The maintainer asked what each badge meant, observed that `settled`
appeared on every card that the alternatives were folded away behind, and
required the view to earn the ink it uses: show a badge only when it varies,
and say what the exception states mean.

## Decision

- A card chips its state only when the state is an exception: `open`,
  `rejected`, or `unrecorded` (no marker at all). A `settled` node renders no
  chip, because the chosen answer already reads as settled and the option
  blocks carry their own state badges.
- The state still travels on every card as `data-state`, untouched, so the
  unlock-edge styling and the layout script keep reading it. This is a
  presentation rule, not a data one.
- The legend lists an entry only when the picture draws the symbol that entry
  quotes: `● Human override` appears only when at least one answer overrode a
  recommendation, and the exception states gain keys (`open` — unresolved,
  `rejected` — not taken, `unrecorded` — no state marker) only when a card draws
  that chip.
- A folded option writes its state as plain text, not as a chip. Its word is
  already readable, so repeating it as a pill would add a symbol to the page and
  a key to the legend for something that needs neither.
- Every remaining legend entry waits for its object as well: the
  selected-answer key for a settled option, and the unlocked key for an edge the
  view styles as a frontier step. A view whose picture supports no entry draws
  no legend panel rather than an empty one.
- An edge key carries a line sample in the stroke the view draws — the gray
  dependency stroke or the green frontier stroke — because the dangling em dash
  it used before looked like a line without looking like either of them, which
  is how a reader came to take it for the connecting lines it never named. The
  view draws exactly two edge styles to name: the third, lighter stroke that
  marked nested links is dropped, since its rule also fired for the session
  card's edges and so had no honest label.
- The same rule covers the rest of the chrome: the Info panel lists a statistic
  only when its count is non-zero, and the decision map keys its supersede,
  reference, and deliberation entries only when it draws that edge or marker.
- Whether a follow-up was unlocked is decided once, in the outline layer, and
  recorded on the card as `data-unlocked` for the drawn edge to read. The legend
  is rendered on the server, so a second copy of the rule in the browser could
  hide a key the page still draws, or draw one it does not.
- `[open]` is the state the view is built to make visible: an unresolved
  question chips amber on an otherwise chip-free card, which is exactly the
  case this rule exists to surface.

## Alternatives considered

- **Keep the chip on every card**: rejected. `settled` is what a node is when
  nothing else is said; printing it on all 41 chips of this repository's eight
  trees told the reader nothing, and it competed with the exceptions that do
  carry information.
- **Keep the chip but replace `settled` with another always-present label**,
  such as the option count or the question's position: rejected. The position
  and count are already visible in the card itself, so the substitution trades
  a constant for a redundancy instead of for information.
- **Drop the chip position entirely, exceptions included**: rejected. An
  `[open]` question, a `[rejected]` one, and an untagged node are the cases a
  reader most needs flagged, and `validate` does not check the appendix for
  state markers — so the gray `unrecorded` chip is the only signal that a tree
  was recorded incompletely.
- **Keep every legend entry, treating it as documentation of the vocabulary**:
  rejected. A key names a symbol on the page; an entry for a symbol no card
  shows sends the reader hunting for it, which is how `● Human override` read
  on a tree with zero overrides.
- **Chip every option's state so the `rejected` key has a pill to point at**:
  rejected. It repairs the mismatch from the wrong end — the alternatives would
  carry a repeated red pill apiece to justify a legend entry that earns its place
  only when a card draws the state. The option text already says which
  alternative lost; only the card states need decoding, and the state keys
  follow the cards that draw them.
- **Style the legend keys as plain text rather than reusing the chip**: rejected.
  The key is a quotation of the chip, so reusing the chip's own class keeps the
  legend and the cards in step by construction rather than by two color lists
  agreeing.
- **Recompute the unlock rule in the browser and withdraw the legend key from
  the script**: rejected. The legend is part of the server-rendered document, so
  the key would be drawn and then hidden, and the rule would live in two
  languages that have to agree. Recording the answer on the card keeps one
  implementation, which Mermaid now shares instead of keeping its own copy.
- **Keep a zero count, since zero is itself a fact**: rejected. A count of zero
  reads as an invitation to look for what is being counted, which is the same
  defect as a legend key without a symbol. A view with nothing to report says so
  by drawing nothing.
- **Keep the dashed nested stroke and key it as a third edge style**: rejected.
  Writing the label for it showed the rule has no single meaning: the dash fires
  both for a nested link that is not a frontier step and for the session card's
  edges to each decision, so any label would be false somewhere. A style that
  cannot be named is a style the legend cannot teach, and the nesting depth it
  hinted at is already visible in the layout.
- **Leave the keys as text and explain the edge styles in prose instead**:
  rejected. The reader meets the picture before the prose, and the map already
  answers the same question with line samples; two views disagreeing about how
  to quote a stroke is what the shared canvas was meant to stop.

## Consequences

- A finished tree now reads as cards with no state noise, and any chip or key on
  the page marks something worth a look. The decision map follows the same rule,
  so neither view keys a mark it does not draw.
- The exception vocabulary is visible where it is needed: the legend explains
  `open` / `rejected` / `unrecorded` on the page that shows them, and the
  `[settled]` default is documented in the record format instead.
- The unlock predicate now lives once, in the outline layer, and is shared by
  the card tree, the drawn edge, and Mermaid — the code previously asked the same
  question in two places, which is how a legend and a picture drift apart.
- Five tests hold the rule: a settled card renders no chip while `data-state`
  survives; a legend entry appears only for a chip the tree draws; a folded
  `rejected` option adds no key because it is text; a picture with nothing to key
  draws no legend panel; and the Info panel lists no zero count. A sixth pins the
  edge keys: the gray sample appears with any link and the green sample only when
  a follow-up was unlocked. The map has its own test that a lone decision draws
  no legend and reports one count.
- The maintainer raised the problem and set the requirement — earn the ink by
  showing only what varies, and pick a better label when one exists; the
  mechanism (exception-only chips, legend keys derived from the chips drawn) is
  the agent's proposal, which the maintainer adopted after asking for a real
  counterexample to the claim that the badge never varies. The maintainer then
  caught the first cut keying a `rejected` chip no card drew, and asked for the
  rest of the same class to be found rather than waiting to spot them one at a
  time; the audit that followed is what turned three leftover keys and counts
  into one stated rule for the tree, the map, and the shared toolbar.
