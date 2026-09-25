## Purpose

Generate a visual relationship graph of the decisions in an ADR Kit
repository so the evolution of the architecture (what superseded what, what
builds on what, when decisions clustered) is legible without opening every
record.

## Requirements

### Requirement: Mermaid graph output

`adrkit graph` SHALL emit a Mermaid `flowchart` document of all numbered
decisions in the repository. Nodes SHALL be labeled with the decision number
and title, and each node SHALL link to its record file with a
repository-relative path. Records that are retired — `status: superseded`, or
archived without a supersession — SHALL be visually distinct from active
implemented records, drawn with the same retired dashed, gray styling.

#### Scenario: default invocation emits Mermaid

- **WHEN** `adrkit graph` runs inside a repository with at least one implemented decision
- **THEN** the output starts with `flowchart` and contains one node per decision, labeled with its number and title

#### Scenario: node click target

- **WHEN** the Mermaid output contains a node for decision `N`
- **THEN** a `click` statement points at the record's path under `adr/implemented/`

#### Scenario: superseded styling

- **WHEN** a decision has `status: superseded`
- **THEN** the Mermaid output assigns it a styling class distinct from implemented decisions

#### Scenario: archived record styling

- **WHEN** a numbered record in `adr/archived/` is not superseded
- **THEN** the Mermaid output assigns it the same retired (dashed, gray) styling class as a superseded record, distinct from active implemented decisions

### Requirement: formal supersede edges

The graph SHALL draw one edge per `superseded-by` front matter field, from
the superseded decision to its replacement, labeled as a supersession. In
Mermaid output the edge SHALL be styled with a long-dash stroke pattern via
a `linkStyle` statement so it reads as a distinct-but-subtle relationship,
consistent with the project website's decision graph. The `==>` edge
syntax, direction, and label remain unchanged; only the stroke is overridden.

#### Scenario: supersede edge is drawn

- **WHEN** decision 1 carries `superseded-by: 11`
- **THEN** the output contains a supersession-labeled edge from node 1 to
  node 11

#### Scenario: supersede edge is drawn as long dashes in mermaid

- **WHEN** `adrkit graph --mermaid` runs and decision 1 carries
  `superseded-by: 11`
- **THEN** the output contains the `==>|superseded by|` edge from node 1 to
  node 11 and a trailing `linkStyle` statement applying a long-dash pattern
  to that edge

#### Scenario: reference edges keep their default style

- **WHEN** `adrkit graph --mermaid` output also contains mined reference
  edges (`-.->`)
- **THEN** no `linkStyle` statement restyles the reference edges; only the
  formal supersede edges receive the long-dash override

#### Scenario: supersede styling applies per edge index

- **WHEN** a repository has multiple supersede edges
- **THEN** each supersede edge receives its own `linkStyle` statement
  indexed to its declaration order, and no two linkStyle statements target
  the same edge

### Requirement: mined reference edges

The graph SHALL draw dashed edges for references to other decisions mined
from record bodies (`ADR-N` and `ADR N` patterns). A record SHALL NOT get an
edge to itself. When a mined edge joins two records already connected by a
formal supersede edge, the mined edge SHALL be dropped in favor of the
formal one.

#### Scenario: prose reference becomes a dashed edge

- **WHEN** the body of decision 13 mentions `ADR-12` and 13 is not formally
  superseded by or superseding 12
- **THEN** the output contains a dashed edge from node 13 to node 12

#### Scenario: self-reference is ignored

- **WHEN** a record body mentions its own number
- **THEN** no edge from the node to itself appears in the output

#### Scenario: duplicate with formal edge is dropped

- **WHEN** record A's body mentions record B and A also carries
  `superseded-by: B`
- **THEN** exactly one edge (the solid formal one) connects A to B

### Requirement: temporal grouping

The graph SHALL group decisions into per-date containers - Mermaid
subgraphs titled with the date and count for same-date decisions; DOT
output SHALL rank same-date decisions at the same layer in a left-to-right
layout. Grouping SHALL NOT imply continuity between dates (no empty
in-between buckets).

#### Scenario: same-date decisions share a subgraph

- **WHEN** decisions 2 and 3 both carry `date: 2026-08-17`
- **THEN** the Mermaid output places their nodes in one subgraph whose
  title contains `2026-08-17`

### Requirement: formal-only mode

`adrkit graph --formal-only` SHALL emit only the formal `superseded-by`
edges, omitting all mined reference edges, in every format.

#### Scenario: mined edges suppressed

- **WHEN** `adrkit graph --formal-only --dot` runs on a repository whose
  records cross-reference each other in prose
- **THEN** the output contains the supersede edge and none of the mined
  reference edges

### Requirement: graph output formats

`adrkit graph` SHALL support `--mermaid` (default), `--dot`, `--text`, and
`--html`.
DOT output SHALL be a valid Graphviz directed graph of the same nodes and
edges. `--text` output SHALL print a terminal-readable tree of the same
graph. Requesting two different formats in one invocation MUST fail with an
error naming the conflicting flags.

#### Scenario: conflicting format flags fail

- **WHEN** `adrkit graph --mermaid --dot` runs
- **THEN** the command exits non-zero with an error naming both flags

#### Scenario: DOT output

- **WHEN** `adrkit graph --dot` runs
- **THEN** the output is a `digraph` statement containing the same node and
  edge sets as the Mermaid output

#### Scenario: text output

- **WHEN** `adrkit graph --text` runs
- **THEN** the output is a tree naming the same decisions as the Mermaid
  output

### Requirement: offline HTML map

`adrkit graph --html` SHALL emit one self-contained HTML document of the same
nodes and edges, in chronological columns grouped by `created`, with supersede
and reference edges drawn distinctly, tag tinting, and retired styling. The
document SHALL need no network and no CDN, SHALL be an interactive canvas
(pan, zoom, fit-to-view, 1:1, and keyboard navigation, with a trackpad pinch
zoom anchored at the pointer), SHALL link each node to its record file, and
SHALL mark the nodes whose `## Deliberation` appendix parses to at least one
node, without excluding them. Requesting `--html` with another format MUST fail
naming the conflicting flags.

#### Scenario: offline map

- **WHEN** `adrkit graph --html` runs
- **THEN** the output is one HTML document with an inline `svg` and no external
  script or stylesheet reference

#### Scenario: pointer-anchored zoom

- **WHEN** a trackpad pinch (a `ctrlKey` wheel event) arrives over a node
- **THEN** the canvas zooms with that point staying under the pointer

#### Scenario: deliberation marker

- **WHEN** a decision carries a `## Deliberation` appendix
- **THEN** its map node is marked `has-deliberation` and still included in the
  graph

#### Scenario: a non-tree appendix is not marked

- **WHEN** a record has a `## Deliberation` section that parses to no nodes
- **THEN** its map node is not marked `has-deliberation`, matching `adrkit tree`
  refusing to render it

#### Scenario: conflicting flags

- **WHEN** `adrkit graph --html --mermaid` runs
- **THEN** the command exits non-zero with an error naming both flags

### Requirement: Dedicated visualization workflow

The installed `adrkit-visualize` skill SHALL route whole-set visualization
requests to `adrkit graph --html`, independently of the grilling workflow.
It SHALL open successfully generated HTML in the default browser and return a
file link, unless the user requests a file only or no browser opening. If opening
is unavailable or fails, it SHALL explain and retain the file link.

#### Scenario: user asks to visualize all ADRs

- **WHEN** the user requests a visualization of the whole decision set
- **THEN** the visualization workflow renders the map without starting a grilling session or creating records

### Requirement: Compact canvas toolbar

The offline HTML view SHALL keep its title and the Info disclosure in one
compact header, with the canvas filling the remaining viewport height. A legend
panel SHALL float over the canvas's bottom-left corner carrying the view's
legend, and the zoom controls SHALL float over the bottom-right corner; neither
panel SHALL resize the canvas. Long titles SHALL truncate in the header and
remain fully readable in the Info disclosure, which SHALL list the labeled
statistics and the gesture instructions, and SHALL list a statistic only when
its count is non-zero.

The legend SHALL quote only what the map draws: the supersede key waits for a
supersede edge, the reference key for a reference edge, and the deliberation key
for a marked node. A map whose picture supports no entry SHALL draw no legend
panel.

#### Scenario: viewing a large diagram

- **WHEN** the view loads on a desktop viewport
- **THEN** one compact toolbar precedes the canvas, with no separate title, statistics, or footer rows
- **AND** the legend panel and the zoom controls float over the canvas without resizing it
- **AND** opening Info overlays the canvas without resizing it

#### Scenario: a map with nothing to key

- **WHEN** no decision supersedes another, none references another, and none carries a deliberation tree
- **THEN** the map draws no legend panel rather than keys for marks it does not draw
- **AND** the Info panel lists only the counts the map supports

#### Scenario: narrow viewport and keyboard access

- **WHEN** the viewport narrows
- **THEN** the toolbar may wrap, all controls remain reachable, and the canvas fills the remaining space
- **AND** Info can be opened with the keyboard and closed with Escape

### Requirement: Map links resolve from the file's own location

`adrkit graph --out <path>` SHALL write the output to `<path>` and resolve each
map node's record link against that file: a repository-relative path while the
map is written inside the repository, and an absolute `file://` URL when it is
written outside it. Redirecting stdout SHALL keep record-relative links.

#### Scenario: map written to a temporary directory

- **WHEN** `adrkit graph --html --out /tmp/decisions.html` runs
- **THEN** the file is written and every node link is an absolute `file://` URL to its record

#### Scenario: map written inside the repository

- **WHEN** the map is written into a subdirectory of the repository
- **THEN** every node link is relative to that subdirectory and resolves to the record

#### Scenario: a destination whose directory is missing

- **WHEN** `--out` names a path whose directory does not exist
- **THEN** the command exits non-zero and writes nothing

### Requirement: Trace direct relationships

The offline map SHALL emphasize a hovered or keyboard-focused decision and its
direct neighbours through reference and supersession edges, dimming unrelated
nodes and edges. Leaving the diagram or pressing Escape SHALL clear emphasis.
The interaction SHALL preserve link activation and canvas dragging.
Image export SHALL omit transient emphasis.

#### Scenario: inspect a decision and share the map

- **WHEN** a decision is hovered or keyboard-focused
- **THEN** its incoming and outgoing relationships remain prominent
- **AND** unrelated relationships fade, without hiding their nodes
- **AND** exporting a PNG produces the same brightness as an unfocused view

### Requirement: Directional connection routing

Cross-date connections SHALL use facing card sides. Same-date connections SHALL
loop beside their column. Connections on a shared card side SHALL use distinct
attachment points within the card height. The drawing box SHALL contain all
curves and arrowheads.

#### Scenario: several references to an older decision

- **WHEN** multiple decisions reference an older decision
- **THEN** backward links leave the newer cards on the left and arrive on the older card on the right
- **AND** their attachment points are spread rather than stacked at the card midpoint

### Requirement: reads only numbered decisions

`adrkit graph` SHALL build the graph from the numbered decisions in
`adr/implemented/` and `adr/archived/` only; proposals in `adr/proposed/` and
rejected records in `adr/rejected/` MUST NOT appear because they carry no
number. The command SHALL require an ADR Kit repository and fail with the
standard not-initialized error otherwise. An unparseable record SHALL fail the
command with that record's parse error, consistent with `adrkit list`.

#### Scenario: unnumbered records excluded

- **WHEN** a repository has one implemented decision and one pending proposal
- **THEN** the graph contains exactly the decision's node

#### Scenario: outside a repository

- **WHEN** `adrkit graph` runs in a directory with no ADR Kit repository
- **THEN** the command exits non-zero with the init hint
