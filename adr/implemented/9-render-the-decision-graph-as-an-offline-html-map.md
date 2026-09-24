---
status: implemented
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: c4c58fe
tags: [visualization, decision-graph, agent-integration]
---

# ADR: 9 Render the decision graph as an offline HTML map

## Problem

ADR 8 gave a single grilling decision an offline, self-contained HTML card tree,
but the portfolio view (`adrkit graph`) still emitted only Mermaid, DOT, or text
and left rendering to GitHub or an editor. The capability was inconsistent: one
decision had a maintained offline view, the whole set did not. The maintainer
asked whether the two visualizations collide and whether an all-decision view
should exclude grilling decisions. They do not collide: `graph` reads only front
matter and mined `ADR-N` references, while `tree` reads one record's
`## Deliberation` outline, so they are two zoom levels of the same object. Nor is
"grilling" an excludable category: ADR 3 rejected a method enum, so the only
marker is the optional deliberation appendix, and excluding it would drop core
decisions and cut supersede and reference edges through them.

## Decision

- Render the whole decision set as an offline, self-contained HTML map behind
  `adrkit graph --html`, alongside the existing `--mermaid`, `--dot`, and
  `--text`. Draw it with a bespoke static layout computed at generation time:
  decisions grouped by `created` date, solid supersede edges, dashed mined
  reference edges, tag tinting, and retired styling, with the record path as the
  node link. No CDN, no bundled third-party renderer, no runtime dependency.
- Keep the map and the per-decision deliberation card tree as two independent
  commands and two zoom levels. Mark deliberation-bearing decisions, never
  exclude them: each node carries a stable `data-adr` identity and a
  `has-deliberation` marker when the record has a `## Deliberation` appendix.
- Defer linkage between the two HTML views. The map keeps the three hooks that
  make a later explorer cheap without changing its format: stable node
  identity, the has-deliberation marker, and the node-to-record link.
- The installed `adrkit-grill` skill routes two distinct requests: visualize one
  recorded decision or grilling result to `adrkit tree <N> --html`, and
  visualize the whole decision set to `adrkit graph --html`. Call them the
  decision tree and the decision map so the two levels are not conflated.
- The website's hand-maintained `Graph.astro` demo stays independent for now;
  the generated static geometry is kept reusable so the site can later consume
  one source of truth.

## Alternatives considered

- **Inline the Mermaid runtime**: rejected. It is offline and low-effort, but it
  adds a multi-megabyte third-party bundle to a zero-dependency CLI and a
  vendored asset to maintain. The graph's shape is constrained enough to draw
  ourselves.
- **Keep the CLI source-format only and let the website or GitHub render**:
  rejected. That is the inconsistency this record removes; the card tree already
  set the expectation that a view is a maintained artifact.
- **One unified single-file explorer now**: rejected for this phase. It forces
  the harder artifact-shape choice (one file versus an `index` plus per-record
  pages) before the map exists, and couples the graph renderer to the card
  tree. Deferred, not rejected.
- **Exclude deliberation-bearing decisions from the map**: rejected. Grilling is
  not a record type (ADR 3), and excluding ADRs 3, 5, 6, 7, and 8 would delete
  central decisions and break the 5→8 and 6→7 supersede edges.
- **Give the map its own command (`adrkit map` or `adrkit viz`)**: rejected. The
  scope is already `graph`; a new output format is a smaller surface than a new
  command, and `graph --html` mirrors `tree --html`.
- **Open the browser automatically**: rejected in line with ADR 8; the command
  prints one self-contained file and the agent returns a link.

## Consequences

- The CLI gains one output format, not one runtime dependency; generated maps
  work offline and need no frontend service. Presentation quality for the
  portfolio view is now owned by the repository, like the card tree.
- Marking deliberation-bearing nodes exposes the two-level model in the map
  itself and gives a future explorer stable hooks without committing to it.
- The skill, root and `adr/` READMEs, bilingual CLI and workflow docs,
  `llms.txt`, the `init` README template, and this repository's own agent
  integrations change together. The decision-graph spec gains an HTML
  requirement; the deliberation-tree spec is untouched.
- The website's `Graph.astro` remains a hand-maintained mirror and stays a known
  drift point (AGENTS.md already requires periodic regeneration). A later change
  may make the site consume the generated map.

## Deliberation

- Render the whole decision set as an offline HTML map [settled]
  - Q: Do the all-decision graph and the per-decision deliberation tree conflict? [settled]
    - A: No; they are complementary zoom levels that read different data [settled] (recommended)
    - A: Yes; one should exclude the other [rejected] — different scopes and different source data
  - Q: Should the all-decision map exclude grilling decisions? [settled]
    - A: Mark deliberation-bearing decisions, never exclude them [settled] (recommended)
    - A: Exclude them [rejected] — grilling is not a record type and exclusion cuts supersede and reference edges
  - Q: What is the relationship model between the two views? [settled]
    - A: Two zoom levels with drill-down linkage, not a merger [settled] (recommended)
    - A: Two fully independent commands with no linkage ever [rejected] — abandons capability parity
    - A: One unified explorer [rejected] — forces the artifact-shape choice before the map exists
  - Q: How should the map render offline? [settled]
    - A: A bespoke static layout with no CDN and no bundled renderer [settled] (recommended)
    - A: Inline the Mermaid runtime [rejected] — a multi-megabyte vendored third-party bundle
    - A: Keep the CLI source-format only [rejected] — leaves the overall view without a maintained artifact
  - Q: When should linkage land? [settled]
    - A: Defer it; ship the map with stable node ids, a has-deliberation marker, and a record link [settled] (recommended)
    - A: Build the single-file explorer now [rejected] — couples the renderers before the map is proven
    - A: Link only to records and drop the tree from the map forever [rejected] — gives up the agreed linkage
  - Q: What should the command surface and naming be? [settled]
    - A: `adrkit graph --html` as the decision map, with `tree --html` as the decision tree [settled] (recommended)
    - A: A new `adrkit map` or `viz` command [rejected] — a larger surface for the same scope
- Define how a map node behaves [settled]
  - A: Link to the record file and mark has-deliberation, without expanding the tree [settled] (recommended)
  - A: No interaction at all [rejected] — the map should stay navigable
- Decide the website's relationship to the generated map [settled]
  - A: Keep Graph.astro independent for now and keep the geometry reusable [settled] (recommended)
  - A: Couple the site to the generated map now [rejected] — extra build coupling before the map is proven
