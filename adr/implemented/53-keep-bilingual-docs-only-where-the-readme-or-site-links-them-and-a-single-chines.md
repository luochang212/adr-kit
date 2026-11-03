---
status: implemented
date: 2026-11-03
description: Read before creating or translating a docs/ file, to decide whether
  it needs an English counterpart.
raised-by: human
decided-by: human
created: 2026-11-03
paths:
  - docs/**
  - AGENTS.md
  - test/docs.test.ts
---

# ADR: 53 keep bilingual docs only where the README or site links them and a single Chinese copy elsewhere

## Problem

The repository translated documentation in inconsistent ways. `README.md` and
`README.zh.md` are a deliberate bilingual front door, and four reference
documents linked from the README and `site/public/llms.txt` (`cli`,
`record-format`, `workflow`, `upgrading`) carry English and Chinese versions.
But the docs index (`docs/README.md` and `docs/zh/README.md`) was also
maintained twice while nothing linked to it, and the pair had already drifted:
the Chinese upgrade guide never received the 0.35.0 Signal-theme note that the
English copy carries. A translation pair with no reader pays the maintenance
cost and still drifts.

The working rule is by audience: a document the README or site links serves
people who arrive from outside, and it stays bilingual; a document only the
maintainer reads needs one language. Chinese is the maintainer's language, so
the internal copy is Chinese.

## Decision

Bilingual documentation exists exactly where an external entry point links it:
the two READMEs, and the four reference documents named by the READMEs and
`site/public/llms.txt` (`docs/cli.md` + `docs/zh/cli.md`,
`docs/record-format.md` + `docs/zh/record-format.md`,
`docs/workflow.md` + `docs/zh/workflow.md`,
`docs/upgrading.md` + `docs/zh/upgrading.md`).

Everything else under `docs/` keeps a single copy in Chinese: the index
(`docs/README.md`), and internal notes such as `release.md`,
`recording-evaluation.md`, research, and reviews. English-only files that
already exist stay as they are — this rule governs new files and the pairs
collapsed here, not a retroactive translation of history. The docs index is
collapsed accordingly: its Chinese content lives at `docs/README.md`, the
`docs/zh/README.md` duplicate is deleted, and ADR 43's `paths:` entry and its
one structural sentence are refreshed mechanically.

The four bilingual pairs keep drifting as a known risk; the docs test ties
each pair to the same required facts, so a translation that misses a release
note fails the suite rather than shipping silently.

## Alternatives considered

- **Collapse all docs pairs to Chinese**: rejected. The four reference
  documents are linked from the READMEs and `llms.txt`; deleting their English
  versions would point English readers at Chinese pages.
- **Translate every internal document into English for symmetry**: rejected.
  Symmetry is not a reader. Research and review snapshots are historical
  records; translating them buys nothing and creates more copies to drift.
- **Keep both indexes and add a parity gate**: rejected. A gate on a file
  nothing reads preserves the cost and adds machinery; deleting the duplicate
  removes the cost.
- **Delete English docs that exist today**: rejected. The rule is about
  audience-driven maintenance, not about erasing history that is already
  published.

## Consequences

### Verification

- `docs/zh/README.md` is gone; `docs/README.md` is the Chinese index and links
  the four bilingual references at their `docs/zh/` paths.
- The four bilingual pairs and both READMEs keep their structure and pass the
  docs tests, which now also assert the single-copy index rule.
- `adrkit validate --all` passes: ADR 43's `paths:` entry for the retired
  index is removed, so no record names a deleted file.
- `AGENTS.md` states the audience rule so a future agent adds a translation
  only for a linked document.

### Trade-offs

- A future internal document that grows an external readership needs a
  deliberate translation, prompted by someone actually linking it.
- The single Chinese index links to bilingual documents by their Chinese
  paths, which looks asymmetric to an English reader arriving at `docs/` —
  accepted, since the READMEs are the external entry point.
- Historical records still describe the retired index in their rationale
  prose; Git history and this record explain the change rather than rewriting
  those bodies.

