---
"adr-kit": patch
---

- Decision numbers no longer use zero padding: the first decision is
  `1-use-sqlite.md` with `# ADR: 1 Use SQLite` (was `0001-...` / `# ADR:
  0001 ...`). Numbers grow naturally past 9999, and zero-padded titles or
  `superseded by` references are rejected. Updated the parser, validator,
  templates, command output, skills, docs, and test fixtures together.
