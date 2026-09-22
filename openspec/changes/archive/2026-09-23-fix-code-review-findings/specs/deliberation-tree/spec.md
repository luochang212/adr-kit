## MODIFIED Requirements

### Requirement: Annotated deliberation grammar

A `## Deliberation` node SHALL be
`- [Q: | A: ]<text>[ [status]][ (recommended)][ — <reason>]`. The optional
`Q:`/`A:` prefix marks a question or an option; `[settled]`, `[rejected]`, or
`[open]` is the node's state; `(recommended)` marks the option the agent
recommended; ` — <reason>` explains the node. The em dash with surrounding
spaces SHALL be the only separator, so a hyphen inside the node text is text
and can never hide the state or the recommendation; when the separator appears
more than once, the first SHALL begin the reason. A state marker SHALL be
recognized only when everything after it to the end of the content is whitespace
or a parenthetical group (so a legacy `(round N)` stays text), never when prose
follows it, so a bracketed state word embedded in a sentence SHALL remain part
of the node text. A question's answer SHALL be its `[settled]` option
child; a settled follow-up question SHALL NOT be treated as an answer. When the
tree marks a recommended option and the question's settled option child is not
it, the question SHALL be reported as an override of the agent's
recommendation; when no option is marked `(recommended)` there is nothing to
override and no override SHALL be reported. The text, Mermaid, and HTML
renderers SHALL report the same override for the same tree.

#### Scenario: a reason after the status is parsed

- **WHEN** a node reads `- A: A1 do not persist it [rejected] — keep only the distilled ADR`
- **THEN** the node's state is `rejected` and its reason is `keep only the distilled ADR`

#### Scenario: a hyphen in the text is not a reason

- **WHEN** a node reads `- A: Postgres - it is proven [settled] (recommended)`
- **THEN** its text is `Postgres - it is proven`, its state is `settled`, and it is still marked as the recommendation

#### Scenario: a question is distinguished from an option

- **WHEN** a node carries a `Q:` prefix and a child carries an `A:` prefix
- **THEN** the renderer treats the first as a question and the second as an option

#### Scenario: an override is detected

- **WHEN** a question marks a recommended option and its `[settled]` option child is not that option
- **THEN** the renderer marks the question as overridden

#### Scenario: a taken recommendation is not an override

- **WHEN** a question's `[settled]` option child is marked `(recommended)`
- **THEN** the renderer marks the node as following the recommendation, not overridden

#### Scenario: no recommendation means no override

- **WHEN** a question's `[settled]` option child has no `(recommended)` sibling
- **THEN** the renderer reports the node's state and does not mark an override

#### Scenario: a settled follow-up is not an answer

- **WHEN** a question has a recommended option that is not settled and a settled follow-up question child
- **THEN** no override is reported, because a follow-up question is not an answer

#### Scenario: renderers agree on the override

- **WHEN** one tree is rendered as text, Mermaid, and HTML
- **THEN** all three report the same overridden questions

#### Scenario: a bracketed state word in prose stays text

- **WHEN** a node reads `- Note: the [open] state is documented`
- **THEN** its text is `Note: the [open] state is documented` and it has no recorded state

#### Scenario: only the first em dash separates the reason

- **WHEN** a node reads `- A: Use Postgres [rejected] — proven at scale — and cheap`
- **THEN** its text is `Use Postgres`, its state is `rejected`, and its reason is `proven at scale — and cheap`

### Requirement: Exception-only state labels

A card SHALL draw a state label only when its state is an exception to
`settled`: `open`, `rejected`, or no recorded state. A settled card SHALL draw
no state label, because its chosen answer already states the outcome, and the
option blocks carry their own state badges. Every card SHALL keep its state as a
data attribute whether or not a label is drawn, so edge styling and layout read
the same value. A folded option SHALL write its state as plain text rather than
as a chip. Each card SHALL carry whether its incoming edge is an unlocked one,
so the drawn edge and the legend read one answer instead of each deciding for
itself.

The view SHALL draw exactly two edge styles: the gray dependency stroke for
every recorded link, and the green frontier stroke for a follow-up that a
settled choice unlocked.

The legend SHALL quote only what the picture draws: an entry appears when the
view contains the symbol that entry points at, and the panel itself SHALL NOT be
drawn when the legend has no entries. The override key waits for a question that
took other than the recommended option, the selected-answer key for a settled
option, and each exception state waits for a card that draws its chip. An edge
key SHALL carry a line sample drawn in the stroke it names, and SHALL wait for a
link the view actually styles with that stroke: the dependency key for a
dependency link (a parented card that is not an unlocked follow-up), and the
frontier key for an edge the view styles as a frontier step.

#### Scenario: a settled question draws no state label

- **WHEN** every question in the tree is settled
- **THEN** no card draws a state label, and each card still carries its state for the layout and edge styling

#### Scenario: an unsettled or untagged question draws its state

- **WHEN** a question is `[open]`, `[rejected]`, or carries no state marker
- **THEN** that card draws the `open`, `rejected`, or `unrecorded` label and the legend explains what it means

#### Scenario: the legend keys only what the page draws

- **WHEN** the tree contains no answer that overrode a recommendation, no edge styled as a frontier step, or no card that draws an exception chip
- **THEN** the legend omits that key rather than sending the reader to look for a symbol that is not there
- **AND** a tree whose picture supports no entry at all draws no legend panel

#### Scenario: a dependency key waits for a dependency link

- **WHEN** every parented card in the tree is an unlocked follow-up, so the view draws only frontier edges
- **THEN** the legend draws the frontier key and no dependency key

#### Scenario: an edge key samples the line it names

- **WHEN** the tree draws dependency links and no unlocked one
- **THEN** the legend carries a gray line sample naming the dependency link and no frontier key
- **AND** once a settled choice raises a follow-up, the green frontier sample joins it

#### Scenario: a folded option is plain text

- **WHEN** an option is rejected, open, or untagged and sits inside a collapsed disclosure
- **THEN** its state reads as text beside the option, with no chip, and adds no key to the legend

#### Scenario: one unlock rule for the picture and the legend

- **WHEN** a follow-up question hangs under a settled option of the root card
- **THEN** its card carries the unlocked flag, the drawn edge is styled as a frontier step, and the legend keys it
