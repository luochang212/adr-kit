---
status: implemented
date: 2026-10-12
description: "Read when defining which repository files a decision governs and detecting stale file scopes."
raised-by: agent
decided-by: human
created: 2026-10-12
paths:
  - src/core/adr.ts
  - src/core/templates.ts
  - src/core/validate.ts
  - src/core/glob.ts
  - src/core/relevant.ts
  - src/core/cli-options.ts
  - src/commands/relevant.ts
  - src/cli.ts
---

# ADR: 22 Scope records to file paths for retrieval and drift checking

## Problem

ADR 20 made the four lifecycle folders a context contract, but its only
retrieval axis is intent. An agent asking "which decisions govern this file?"
has no mechanical answer: front matter carries no path scope, no command
filters by file, and relevance is judged by reading prose — the paths the
reading rule names are citations buried in bodies.

Measurement on this repository (2026-10-12): only 6 of 21 implemented records
mention any repository path, and `src/core/adr.ts` — the file whose format is
the product contract — is cited by zero. Grep, the only workaround,
over-matches alternatives and history while under-matching that same zero. The
AGENTS.md duty to keep realization facts aligned with shipped code also has no
mechanical backstop: `validate` checks dates, sections, and references, never
whether a cited path still exists, so a rename silently strands prose
citations. Other 2026 agent-ADR tools converged independently on
`affects`/`applies_to` scoping and "which decisions govern this file/PR"
retrieval, removing ADR 20's earlier "speculative taxonomy" objection.

## Decision

Add an optional `paths:` front matter field — repository-relative glob
patterns naming the files a record governs — and consume it on two surfaces in
one change:

- **`adrkit relevant <path>...`** lists records whose `paths:` globs match,
  grouped by lifecycle folder with ADR 20's reading posture: implemented is
  current authority read in full, proposed is intent, rejected is
  anti-pattern warnings, and archived is excluded. Each match shows the glob
  that fired, so the result is verifiable. A directory argument matches files
  under it through a bounded walk skipping `.git` and `node_modules`. Records
  without `paths:` never match: this is scope retrieval, not full-text search.
- **`adrkit validate` drift check** requires every entry's static directory
  anchor — complete components before the first wildcard, or the full path
  without wildcards — to exist, and requires relative, forward-slashed
  entries. A record scoped to a renamed directory fails instead of silently
  stranding citations, giving the realization-facts duty its first mechanical
  backstop.

Glob semantics stay minimal and dependency-free: `**` crosses directory
separators, `*` stays within one segment, `?` matches one character, and
everything else is literal; no brace expansion or character classes. The field
sits after `tags` in `FRONT_MATTER_ORDER`, is optional on every status, is
carried through lifecycle moves and promotion, and extends ADR 20's context
contract with the file axis it deferred.

## Alternatives considered

- **Keep prose citations and grep**: rejected. Measured here: grep misses the
  most-governed file and cannot separate governance from passing mention.
- **Full-text search over record bodies**: rejected. It answers "which records
  mention this string", over-matches alternatives and history, and needs
  ranking heuristics a deterministic scope field does not.
- **Reuse `tags` as the scope axis**: rejected. A file path is not a theme,
  and overloading tags breaks the existing corpus and shape check.
- **Directory/class taxonomy folders**: rejected. A second folder axis forces
  one record into one area and cannot express file granularity.
- **MCP server with semantic retrieval**: deferred, not rejected. It serves
  agents without shell access and can use the scope field as substrate.
- **Regex drift checking over body prose**: rejected. Unextractable without
  false positives; drift checking needs a structured field.

## Consequences

### Verification

- `FRONT_MATTER_ORDER` includes `paths` after `tags`; the parser accepts an
  optional list of non-empty strings and rejects other shapes.
- `adrkit relevant <path>` groups Implemented/Proposed/Rejected matches, shows
  the matched glob, excludes archived, and states when nothing matches.
- `adrkit validate` fails an entry with a nonexistent static anchor, an
  absolute path, or a `..` segment, and passes valid entries.
- Glob matching supports `**`, `*`, `?` with the stated crossing semantics and
  adds no runtime dependency.
- Lifecycle moves and promotion carry `paths`; the READMEs, record-format
  references, CLI reference, standing orders, skills, `INIT_README`,
  `docs/workflow.md`, `AGENTS.md`, and `adr/README.md` document the field and
  command in the same change. `npm test`, typecheck, and build pass.

### Trade-offs

- **The field goes unfilled.** Mitigation: it ships with `relevant`, the
  dogfooded corpus is scoped on implementation, and `validate` makes a stale
  filled field fail loudly.
- **Glob dialect expectations.** Mitigated by documented minimal semantics and
  unit tests pinning the crossing behavior.
- **Over-scoped records mislead retrieval.** The command prints the glob that
  fired, making over-scope visible at use.
- **Directory walks cost time on huge trees.** The walk is bounded and skips
  `.git`/`node_modules`; the common single-file case never walks.

ADR 23 extends the retrieval consumer with exact Git-base and staged inputs,
explicit incomplete-search diagnostics, and unscoped coverage counts. It
retains the optional field, glob dialect, drift check, and reading postures
defined here; no second retrieval model or record field is introduced.

### Later changes

**Amended by ADR 44:** The tags classification axis is removed and a required applicability description is shown during discovery. Paths remain the deterministic governance scope; descriptions do not turn path matching into semantic search.
