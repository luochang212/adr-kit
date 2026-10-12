---
status: implemented
date: 2026-10-12
raised-by: agent
decided-by: human
created: 2026-10-12
commit: f3ef999
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
filters by file, and `adrkit list` does not even expose `--tag`. Relevance is
judged by reading titles and body prose — the reading rule already tells
agents to "inspect tags, paths, relationships", yet the paths it means are
citations buried in prose.

Dogfood measurement (2026-10-12): only 6 of 21 implemented records mention
any repository path in their body, and `src/core/adr.ts` — the file the
record format itself is the product contract for — is cited by zero records.
Full-text grep, the only workaround, both over-matches (mentions in
alternatives, archived history) and under-matches (that same zero). The AGENTS.md
duty to keep realization facts aligned with shipped code likewise has no
mechanical backstop: `validate` checks dates, sections, seals, and references,
never whether a cited path still exists, so a rename silently strands every
prose citation.

The wider tooling has converged on the same mechanism independently:
`affects`/`applies_to` scoping fields and "which decisions govern this
file/PR" retrieval in at least three 2026 agent-ADR tools. ADR 20 deferred
this axis as speculative "class/area" taxonomy; two years of ecosystem
adoption and this repository's own 16-of-21 tags adoption have since removed
the speculation.

## Decision

Add an optional `paths:` front matter field — a list of repository-relative
glob patterns naming the files a record governs — and consume it on two
surfaces, in one change:

- **`adrkit relevant <path>...`** — a retrieval command that lists the
  records whose `paths:` globs match the given path(s), grouped by lifecycle
  folder with the reading posture ADR 20 defined: implemented records are
  current authority to read in full, proposed records are intent, rejected
  records are anti-pattern warnings, and archived records are excluded (not
  read by default). Each match shows the glob that fired, so the result is
  verifiable. A directory argument matches any file under it (bounded walk,
  skipping `.git` and `node_modules`). Records without `paths:` never match:
  `relevant` is scope retrieval, not full-text search, and must not pretend
  to be one.
- **`adrkit validate` drift check** — every `paths:` entry's static prefix
  (the part before the first wildcard) must exist in the repository, and
  entries must be relative and forward-slashed. A record scoped to a renamed
  directory fails validation instead of silently stranding its citations,
  giving the AGENTS.md realization-facts duty its first mechanical backstop.

Glob semantics stay minimal and dependency-free: `**` crosses directory
separators, `*` stays within one segment, `?` matches one character,
everything else is literal. No brace expansion, no character classes. The
field sits after `tags` in `FRONT_MATTER_ORDER`, is optional on every status,
is carried through lifecycle moves like `tags`, and survives the
proposal-to-decision promotion. This extends ADR 20's context contract with
the file axis it deferred; ADR 20 stays active and links here.

## Alternatives considered

- **Keep prose citations and grep**: rejected. Measured in this repository:
  grep misses the most-governed file in the repo (`src/core/adr.ts`, zero
  citations) and cannot separate governance from passing mention.
- **Full-text search command over record bodies**: rejected. It answers
  "which records mention this string", not "which decisions govern this
  file"; it over-matches alternatives and history, and it needs ranking
  heuristics a deterministic scope field does not.
- **Reuse `tags` as the scope axis**: rejected. Tags classify by theme; a
  file path is not a theme. Overloading them would break the existing
  16-of-21 corpus and the kebab-case shape check.
- **Directory/class taxonomy folders (the ADR 20 wording)**: rejected. A
  second folder axis forces one record into one area, while globs let a
  record govern several; folders also cannot express file granularity.
- **MCP server with semantic retrieval**: deferred, not rejected. It serves a
  different consumer (agents without shell access) and does not need the
  format to change; a scope field is its natural substrate later.
- **Validate drift via regex over body prose**: rejected. Unextractable
  without false positives (example paths, globs in prose, translated docs);
  drift checking is only sound against a structured field.

## Consequences

### Acceptance criteria

- `FRONT_MATTER_ORDER` includes `paths` after `tags`; the parser accepts an
  optional list of non-empty strings and rejects other shapes.
- `adrkit relevant <path>` prints matching records grouped as Implemented /
  Proposed / Rejected with the matched glob per record, excludes archived,
  and states plainly when nothing matches.
- `adrkit validate` fails a record whose `paths:` entry has a nonexistent
  static prefix, an absolute path, or a `..` segment, and passes valid ones.
- Glob matching supports `**`, `*`, `?` with those exact crossing semantics,
  covered by unit tests; no new runtime dependency is added.
- Lifecycle moves and proposal promotion carry `paths` through; the
  bilingual READMEs, `docs/record-format.md` (+zh), the CLI reference, the
  standing orders in `tool-integrations.ts` and the mirrored skills,
  `INIT_README`, `docs/workflow.md`, and this repository's AGENTS.md and
  `adr/README.md` document the field and the command in the same change.
- `npm test`, `npm run typecheck`, and `npm run build` pass.

### Risks

- **The field goes unfilled and becomes a dead axis** — the ADR 20 worry.
  Mitigation: it ships with its consumer (`relevant`) in the same change, the
  dogfooded corpus gets scoped on implementation, and `validate` makes a
  filled-but-stale field fail loudly rather than rot quietly.
- **Glob dialect expectations** (`src/**/*.ts` vs `src/*.ts`): mitigated by
  documented minimal semantics and unit tests pinning the crossing behavior.
- **Over-scoped records mislead retrieval** (a glob so wide every file
  matches). Mitigation: the command prints the glob that fired, making
  over-scope visible at use; review guidance names scoping as a realization
  fact.
- **Directory walks on huge trees cost time**: mitigated by the bounded walk
  (capped file count, skipping `.git`/`node_modules`); the common case is a
  single file, which never walks.

