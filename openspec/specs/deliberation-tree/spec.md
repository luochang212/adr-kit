# deliberation-tree Specification

## Purpose
Renders the optional design tree behind a decision. A grilling session records
its design tree as a nested outline in the decision's `## Deliberation`
appendix; `adrkit tree` turns that outline into a readable text tree or a
Mermaid graph or offline HTML card tree, without ever storing the renderer's format as the source.

## Requirements

### Requirement: Optional Deliberation appendix

A durable decision MAY carry a `## Deliberation` appendix, and a decision
without one SHALL remain valid. When present, the appendix SHALL store the
design tree behind the decision as a nested Markdown list in the annotated
deliberation grammar.

#### Scenario: a decision without the appendix is valid

- **WHEN** `adrkit validate` runs on an accepted decision that has no `## Deliberation` section
- **THEN** validation passes, because the appendix is optional

#### Scenario: status markers are read from the node

- **WHEN** a `## Deliberation` item carries `[settled]`, `[rejected]`, or `[open]`
- **THEN** the renderer reports that status with the node, even when a reason or the `(recommended)` marker follows the tag

### Requirement: Design tree is stored as an outline, not Mermaid

The design tree SHALL be stored as a nested Markdown outline. Mermaid SHALL be a
rendering target produced on demand and SHALL NOT be the stored form.

#### Scenario: the stored appendix is Markdown

- **WHEN** a decision records its design tree
- **THEN** the appendix is a nested Markdown list, not a Mermaid diagram

### Requirement: Tree rendering modes

`adrkit tree <name>` SHALL render a record's `## Deliberation` appendix as a
text tree by default, as a Mermaid graph with `--mermaid`, and as a single
self-contained HTML document with `--html`. It SHALL give the root, questions,
and options distinct visual treatments, label nodes by state, mark the recommended
option, mark an overridden question, and style the edge that raised a follow-up
question. `name` SHALL resolve like other commands (title, file name, or
decision number). A record with no renderable tree SHALL fail with a clear error
rather than print an empty document. Requesting two output formats in one
invocation MUST fail with an error naming the conflicting flags, as
`adrkit graph` does, rather than silently pick one.

#### Scenario: default output is text

- **WHEN** `adrkit tree <name>` runs on a record with a deliberation tree
- **THEN** the output is an indented text tree of the same nodes, annotating the recommended option and any override

#### Scenario: mermaid output

- **WHEN** `adrkit tree <name> --mermaid` runs
- **THEN** the output starts with `graph TD`, uses a distinct shape for the root, questions, and options, colors each node by state, and styles the edge that raised a follow-up question

#### Scenario: html output is a single document

- **WHEN** `adrkit tree <name> --html` runs
- **THEN** the output is one offline HTML document containing a left-to-right card tree, inline styles and scripts, and a legend; no CDN or external request is needed

#### Scenario: missing tree fails clearly

- **WHEN** `adrkit tree <name>` runs on a record with no `## Deliberation` list
- **THEN** the command exits non-zero with an error naming the record and the missing tree

#### Scenario: rounds render as layers

- **WHEN** a tree nests a follow-up question under the node that raised it
- **THEN** the deeper question renders downstream of that node, so the derived frontier layer is visible without storing a round

#### Scenario: two formats are rejected

- **WHEN** `adrkit tree <name> --html --mermaid` runs
- **THEN** the command exits non-zero with an error naming both flags instead of printing one of the two formats

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
### Requirement: Nested dependency

Dependency between recorded questions SHALL be expressed by nesting: a follow-up
question SHALL be a child of the node whose settlement raised it, so related
questions run deeper and unrelated questions stay flat siblings. When the
question, not a single option, raised the follow-up, the follow-up SHALL be a
child of that question. The `Q:`/`A:` prefix SHALL keep a follow-up question
distinct from an option at the same depth. A record SHALL NOT store a frontier
round.

#### Scenario: a follow-up nests under the option that raised it

- **WHEN** a session settles an option and that answer raises a further question
- **THEN** the recorded question is a child of that option

#### Scenario: unrelated questions stay flat

- **WHEN** two questions are both askable without the other being settled
- **THEN** the record stores them as siblings

#### Scenario: an option-independent follow-up nests under the question

- **WHEN** settling a question raises a follow-up regardless of which option won
- **THEN** the recorded follow-up is a child of the question

### Requirement: Offline interactive card tree

The HTML view SHALL group questions with their selected option children and
SHALL expose other options and their reasons through expandable disclosures.
Question-dependent edges SHALL originate at the question; option-dependent
edges SHALL originate at that option. Unsettled or rejected parents SHALL NOT
be marked as having unlocked their follow-ups. The view SHALL preserve all
recorded text, recommendation markers, states, and nested dependencies,
including unannotated nodes and multiple roots. Missing states SHALL NOT be
presented as settled.

#### Scenario: inspect an alternative branch

- **WHEN** an option with follow-up questions is in a collapsed disclosure
- **THEN** its descendants are hidden until that disclosure opens, and then connect to that option without overlapping neighboring cards

#### Scenario: explore a large tree

- **WHEN** the reader folds branches, expands options, pans, zooms, or fits the tree
- **THEN** layout and edges update together; keyboard users can reach controls and move the canvas, and 1:1 restores readable text

#### Scenario: pinch zoom follows the pointer

- **WHEN** a trackpad pinch (a `ctrlKey` wheel event), or a wheel event with `Ctrl` or `Command` held, arrives over a card
- **THEN** the canvas zooms with the point under the pointer staying put

#### Scenario: record text is untrusted

- **WHEN** titles, questions, options, or reasons contain HTML or script-like text
- **THEN** the page displays that content as text without executing it or loading resources from it

#### Scenario: text without spaces wraps

- **WHEN** a title, question, option, or reason is written in a script that does not separate words with spaces
- **THEN** the view wraps it by display width, counting a wide character as two, instead of letting it overflow its card or label

#### Scenario: the unlock edge starts at the node that raised it

- **WHEN** a settled option on the root card raises a follow-up question
- **THEN** the edge from that option to the question is styled as the frontier step, matching the Mermaid renderer

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
### Requirement: On-demand visualization delivery

The installed `adrkit-visualize` skill SHALL route requests to visualize an existing
record directly to the built-in renderer, without starting a new grilling
session. HTML SHALL NOT be a default session deliverable. Markdown remains the
source; agents SHALL NOT invent missing trees or replace the maintained view
with ad hoc generated HTML.

#### Scenario: user asks to visualize a record

- **WHEN** the user asks for a visualization of an ADR with a deliberation tree
- **THEN** the agent generates HTML and returns a clickable file link, opening the generated file in the default browser unless the user asks for a file only or says not to open it; if opening is unavailable or fails, the agent explains and retains the link

#### Scenario: user completes grilling without asking for a visualization

- **WHEN** the session completes and the user has not requested a visualization
- **THEN** the agent records and validates the decision without generating HTML

### Requirement: Compact canvas toolbar

The offline HTML view SHALL keep its title and the Info disclosure in one
compact header, with the canvas filling the remaining viewport height. A legend
panel SHALL float over the canvas's bottom-left corner carrying the view's
legend, and the zoom controls SHALL float over the bottom-right corner; neither
panel SHALL resize the canvas. Long titles SHALL truncate in the header and
remain fully readable in the Info disclosure, which SHALL list the labeled
statistics and the gesture instructions, and SHALL list a statistic only when
its count is non-zero.

#### Scenario: viewing a large diagram

- **WHEN** the view loads on a desktop viewport
- **THEN** one compact toolbar precedes the canvas, with no separate title, statistics, or footer rows
- **AND** the legend panel and the zoom controls float over the canvas without resizing it
- **AND** opening Info overlays the canvas without resizing it

#### Scenario: narrow viewport and keyboard access

- **WHEN** the viewport narrows
- **THEN** the toolbar may wrap, all controls remain reachable, and the canvas fills the remaining space
- **AND** Info can be opened with the keyboard and closed with Escape

### Requirement: Trace a decision path

The offline tree SHALL support hover and keyboard focus on cards, emphasizing
the card's ancestors and visible descendants without highlighting sibling
branches. Emphasis SHALL follow the recorded nesting and currently drawn edges,
including edges anchored to answers. Folding SHALL refresh emphasis. Escape or
leaving the diagram SHALL clear it. Image export SHALL omit transient emphasis
while preserving the current folded view.

#### Scenario: inspect a follow-up question

- **WHEN** a follow-up card is hovered or keyboard-focused
- **THEN** its upstream path and visible downstream branches remain prominent
- **AND** sibling branches fade without being collapsed
- **AND** exporting the tree omits this temporary dimming
