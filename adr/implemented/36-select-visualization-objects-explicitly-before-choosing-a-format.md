---
status: implemented
date: 2026-10-23
raised-by: human
decided-by: human
created: 2026-10-23
tags:
  - visualization
  - cli
  - agent-integration
paths:
  - src/commands/atlas.ts
  - src/commands/graph.ts
  - src/core/cli-options.ts
  - src/cli.ts
  - skills/adrkit-visualize/**
  - src/core/tool-integrations.ts
  - test/graph.test.ts
  - test/cli.test.ts
  - test/integrations.test.ts
  - test/commands.test.ts
  - docs/workflow.md
  - docs/zh/workflow.md
  - README.md
  - README.zh.md
  - AGENTS.md
  - docs/cli.md
  - docs/zh/cli.md
  - site/public/llms.txt
  - site/src/components/Graph.astro
---

# ADR: 36 Select visualization objects explicitly before choosing a format

## Problem

ADR 33 made the full decision atlas the default but kept `--format` as the
selector for the relationship map. Production-path reproduction in a temporary
repository confirmed that `atlas --out adr.html` includes the directory and
record reader, while `atlas --format html --out adr.html` excludes both.
Adding an output-format option changes the generated object. The same behavior
exists without installed skills, so this is a generic CLI ambiguity, not a
particular repository's integration problem. Evidence and diagnosis limits are
in `docs/reviews/2026-10-23-visualization-discovery.md`.

The maintainer rejected format-driven object selection and required an explicit
map parameter. The agent chose the boolean spelling `--map` to fit the existing
`--record` selector without adding another CLI command. The maintainer then accepted unified tree defaults, strict positional
argument handling and object-aware file receipts.

## Decision

Object selection is explicit within the one `atlas` command (ADR 33):

- No selector produces the full decision atlas. `--map` selects the standalone
  relationship map; `--record <name>` selects a record's deliberation tree.
  Map and record selectors are mutually exclusive.
- All three objects default to HTML. `--format` changes encoding only: the
  atlas supports HTML; the map supports HTML, Mermaid, DOT and text; the tree
  supports HTML, Mermaid and text. Non-HTML formats without an object selector
  fail with an actionable map command instead of switching objects.
- `--diagram` is removed. Tree HTML uses the same format option as the other
  objects. `--tag` and `--formal-only` require `--map`; `--lang` remains a
  full-atlas option. Existing content and map link resolution (ADR 14) remain.
- Atlas rejects every positional argument before lookup or file writes and
  points record queries to `--record <name>`.
- File receipts name object, format and absolute destination, for example
  `wrote deliberation tree (html) to <path>`. Without `--out`, stdout contains
  only the artifact.

The maintainer determined explicit selection and accepted unified defaults,
strict argument handling and named receipts. The agent chose the `--map`
spelling. This partially replaces ADR 33's format-driven routing; its single
command, distinct capabilities and removal of graph/tree entry points remain
active. ADR 13's explicit workflow subsets and ADR 14's link rules are unchanged.

## Alternatives considered

- **Only strengthen help and skills**: insufficient. It leaves the surprising
  command behavior intact and depends on agents loading extra instructions.
- **Keep treating source formats as implicit maps, but fix HTML alone**:
  rejected. Output format would still select an object; the maintainer's rule
  applies to every map encoding.
- **Restore a separate graph command**: rejected. Explicit selection is possible
  within the single-command surface ADR 33 already owns.
- **Use a general `--view` enumeration**: not selected. A boolean `--map` adds
  the missing object selector alongside existing `--record`; introducing a
  second way to name the existing record selector is unnecessary for this fix.

## Consequences

### Verification

- CLI tests cover default and explicit HTML atlases without installed skills,
  all map/tree formats, filter/language restrictions, conflicting selectors,
  missing deliberations and the removed diagram flag.
- Positional arguments fail before file creation. File receipts are checked
  across every supported object/format; generated contents remain artifact-only.
- OPTION_SPECS derives parsing, option rejection and completion. All three shell
  completions expose `--map` and omit `--diagram`; help, workflow mirrors,
  bilingual references, standing orders and llms.txt agree.
- Typecheck, unit tests, real CLI subprocess checks, CLI/site builds and ADR
  validation pass. Local integrations are refreshed from the compiled templates.

### Trade-offs

- This deliberately breaks old map scripts: every map export now adds `--map`.
  Old HTML exports without that selector produce the larger full atlas.
- Tree scripts remove `--diagram` or replace it with `--format html`. Scripts
  parsing the bare `wrote <path>` receipt must accept named receipts.
- Loaded agent instructions can remain stale after an executable upgrade.
  Current CLI errors and defaults establish the contract; no compatibility
  aliases or repository-specific prompt workarounds are carried.
