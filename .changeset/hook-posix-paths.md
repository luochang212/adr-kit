---
'adr-kit': patch
---

Validation reports now speak the repository's forward-slash path convention on Windows too: `formatIssues` normalizes the platform separators that issue paths pick up from `node:path` math, so a pre-commit hook failure on Windows reads `adr/implemented/1-test.md` instead of `adr\implemented\1-test.md`. The hook also hands the parser absolute paths again, as `validateRecord`'s relative-path math expects.
