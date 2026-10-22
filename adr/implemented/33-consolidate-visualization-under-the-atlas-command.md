---
status: implemented
date: 2026-10-22
raised-by: human
decided-by: human
created: 2026-10-22
commit: 09a43d9
tags: [visualization, cli, agent-integration]
paths:
  - src/commands/atlas.ts
  - src/commands/graph.ts
  - src/commands/tree.ts
  - src/cli.ts
  - src/core/cli-options.ts
  - src/core/decision-atlas.ts
  - skills/adrkit-visualize/**
  - README.md
  - README.zh.md
  - docs/cli.md
  - docs/zh/cli.md
  - docs/workflow.md
  - docs/zh/workflow.md
  - site/src/i18n/ui.ts
  - site/public/llms.txt
  - test/graph.test.ts
  - test/commands.test.ts
  - test/regressions.test.ts
  - test/integrations.test.ts
---

# ADR: 33 consolidate visualization under the atlas command

## Problem

Three visualization surfaces had accumulated with three entry points:
`adrkit graph` (the relationship map as HTML, Mermaid, DOT, or text),
`adrkit tree` (one record's deliberation card tree or its source), and the
decision atlas (a browsable page generated at site build time and shipped as
the visualize skill's example). The atlas already embeds the map, and it then
renders the `## Deliberation` appendix as a tree in its reader, so the other
two commands had become alternate doors into regions of the same object.

The cost was visible in the routing rule. The visualize skill told the agent to
choose by "the user's question, record count, and relationship density", so a
bare "visualize this repository's ADRs" could produce any of the three
depending on the agent and the session: the output was not stable, and no
single command was the product.

## Decision

- **One visualization command: `adrkit atlas`.**
  - No flags renders the decision atlas from the current records — the
    default answer to an unqualified visualization request.
  - `--record <name> --diagram` renders that decision's deliberation card tree.
  - `--format mermaid|dot|text` exports the relationship map's source, with
    `--tag` and `--formal-only` as filters.
  - `--format html` emits the standalone map page; ADR 14's link resolution
    against the output path still applies.
  - `--record <name> --format mermaid|text` exports that tree's source.
  - `--out <path>` writes any mode instead of returning it.
- **`graph` and `tree` leave the CLI surface** and shell completion. Their
  renderers stay (`src/commands/graph.ts`, `src/commands/tree.ts`) because
  `atlas` routes to them; they are implementation, not entry points.
- **The atlas is the default; the map and the tree are named exports.** The
  visualize skill states that precedence instead of leaving the choice to the
  agent's judgment.
- **Terms are fixed:** the decision atlas is the page, the decision map is the
  relationship map inside it, and the deliberation tree is one record's
  appendix view. The tree's term is used as written; there is no second
  Chinese alias.
- This record amends the command surfaces of ADRs 8, 9, 13, and 14. Their
  rendering, layout, routing, and link-resolution decisions stand; ADR 14's
  mechanism runs under `--format html --out`.

## Alternatives considered

- **Keep all three commands**: rejected. Three names for one object kept the
  vocabulary ambiguous and made the default depend on the agent.
- **Keep `tree` as a hidden advanced command**: rejected. A second discoverable
  surface with no product home is dead weight; a command nobody advertises is
  not a capability, it is maintenance.
- **Delete the card tree and the standalone map**: rejected. Both are real
  capabilities, and folding them into modes keeps them without a second
  renderer or a second vocabulary.
- **Make the atlas a flag of `graph` (`graph --atlas`)**: rejected. The atlas
  is the product and the map is a region of it; that hierarchy would be
  inverted.
- **Make the atlas a subcommand of `tree`**: rejected for the same reason.

## Consequences

### Verification

- The CLI exposes `atlas` only; `graph` and `tree` are rejected as unknown
  commands.
- Each mode is exercised through `main`: the page, `--record --diagram`,
  `--format mermaid/dot/text/html`, the tree's `--format mermaid|text`, and
  `--out`; invalid combinations (record without a mode, a tree `dot`, a mode
  conflict) fail with a named reason.
- The shell completion lists `atlas` and its options; the docs, both READMEs,
  the workflow guides, the visualize skill and its mirrored template, the site
  copy, and `llms.txt` all name the same surface.
- `npm test`, `npm run typecheck`, `npm run build`, `adrkit validate --all`,
  and the site build pass.

### Trade-offs

- `atlas` carries several modes, so its synopsis is longer than any one old
  command. The vocabulary is one word; the flags are the price.
- `--format html` still produces a standalone map page, a view in a file, even
  though the atlas is the product. It stays because it is the lightweight map
  export and the only consumer of ADR 14's link contract.
- Removing `graph` and `tree` is a breaking CLI change; the README upgrade
  section names the replacements.
- `src/commands/graph.ts` and `src/commands/tree.ts` keep the name "command"
  although only `atlas` is dispatched; moving them to `src/core/` is a naming
  cleanup, not a second surface.

The embedded outline described in the Problem was later removed after a
worth-fix review: the reader renders the appendix as part of the record body,
and the card tree remains `atlas --record --diagram`.
