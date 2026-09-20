## Why

Two public projects ship under the same name and attack the same problem from a
different angle: both make ADR retrieval and enforcement, not the record format,
the product. This repository's ADR Kit is deliberately minimal (one `adr/`
directory, plain Markdown, `yaml` only). Reviewing the peers tells us which of
their ideas are worth importing and which conflict with that minimalism, so the
next roadmap decisions are evidence-based instead of assumed.

## What Changes

- Add `docs/research/peer-adr-tools.md`: a sourced comparison of
  `rvdbreemen/adr-kit` and `kschlt/adr-kit` against this repository, an ordered
  list of candidate adoptions, and explicit non-goals.
- No product behavior changes: this is a documentation change
  (`skip_specs: true`). Any candidate it recommends becomes its own change.

## Capabilities

### New Capabilities
<!-- None: this change adds a research document, not behavior. -->

### Modified Capabilities
<!-- None. -->

## Impact

- `docs/research/peer-adr-tools.md` (new) and a link from `docs/README.md`.
- No source, schema, template, or dependency changes.
