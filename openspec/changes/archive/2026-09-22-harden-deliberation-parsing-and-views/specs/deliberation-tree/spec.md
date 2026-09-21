## MODIFIED Requirements

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
and can never hide the state or the recommendation. A question's answer SHALL
be its `[settled]` child. When the tree marks a recommended option and that
child is not it, the question SHALL be reported as an override of the agent's
recommendation; when no option is marked `(recommended)` there is nothing to
override and no override SHALL be reported.

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

- **WHEN** a question marks a recommended option and its `[settled]` child is not that option
- **THEN** the renderer marks the question as overridden

#### Scenario: a taken recommendation is not an override

- **WHEN** a question's `[settled]` child is marked `(recommended)`
- **THEN** the renderer marks the node as following the recommendation, not overridden

#### Scenario: no recommendation means no override

- **WHEN** a question's `[settled]` child has no `(recommended)` sibling
- **THEN** the renderer reports the node's state and does not mark an override

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
