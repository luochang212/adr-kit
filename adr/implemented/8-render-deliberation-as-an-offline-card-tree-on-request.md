---
status: implemented
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: e816e44
tags: [deliberation, visualization, agent-integration]
---

# ADR: 8 Render deliberation as an offline card tree on request

## Problem

ADR 5 made the annotated outline renderable, but its CDN-backed Mermaid HTML
puts every question, option, and reason in a separate box. Real trees become
wide and hard to read. The maintainer reviewed a left-to-right card-tree
prototype and asked how users' agents could reliably deliver that quality.
This supersedes ADR 5's HTML rendering choice while retaining its annotated
grammar, state, recommendation, and override semantics.

## Decision

- Ship an offline card-tree renderer behind `adrkit tree <N> --html`. A question
  and its chosen answers share a card; other options and their reasons are
  expandable. Connect dependent cards from the answer that raised them, or
  from the question when the follow-up is option-independent. Preserve the
  Markdown source and dependency nesting from ADRs 3 and 7.
- Keep the root, question, and option distinctions, state labels, recommendation
  markers, and override signal from ADR 5. Do not infer missing history.
- Embed styles and interaction code in the generated file: branch folding,
  panning, zooming, fit-to-view, and readable text. Keep `--mermaid` and `--text`
  as separate export formats. The CLI gains no runtime dependency.
- Generate HTML only when the user requests a visualization. The installed
  `adrkit-grill` skill routes that request to the renderer and delivers a file
  link by default; it opens a browser only when explicitly requested. A normal
  grilling session records and validates its decisions without creating HTML.

## Alternatives considered

- **Have each user's AI design an HTML page**: rejected. Presentation quality
  would vary between agents and sessions instead of being maintained once.
- **Generate HTML after every grilling session**: rejected by the maintainer;
  visualization is an on-demand action, not a default deliverable.
- **Open the browser after every export**: rejected in favor of file links;
  a link works in both local and remote environments without a forced launch.
- **Keep every alternative expanded in the main tree**: rejected for the
  default view because it obscures the chosen path. Alternatives remain
  available in each question card.

## Consequences

The renderer owns presentation quality; agents still own the accuracy of the
recorded dependencies and reasons. The package must test layout and interaction
against real and mixed-state trees. HTML works without network access and
requires no frontend service. Users receive the workflow via `adrkit init` or
`adrkit update`. The agent proposed the card layout and built-in renderer;
the maintainer approved the prototype and changed the proposed automatic export
policy to on-demand generation, then selected default file-link delivery.
ADR 12 later made browser opening the default for a visualization request, and
ADR 13 moved this routing from `adrkit-grill` to `adrkit-visualize`; on-request
generation, the file link, and the no-open opt-out are unchanged.

## Deliberation

- Make grilling decisions readable as a tree [settled]
  - Q: How should the tree read? [settled]
    - A: A left-to-right card tree with chosen answers and expandable alternatives [settled] (recommended)
      - Q: How can users' agents reproduce the quality? [settled]
        - A: Invoke a built-in offline HTML renderer from the skill [settled] (recommended)
        - A: Have each agent design the HTML itself [rejected] — presentation would vary
  - Q: When should HTML be generated? [settled]
    - A: After every grilling session [rejected] (recommended) — the maintainer wanted it only on request
    - A: Only when the user asks to visualize a decision [settled]
      - Q: How should the artifact be delivered? [settled]
        - A: Provide a file link by default [settled] (recommended)
        - A: Automatically open a browser [rejected] — open only on explicit request
