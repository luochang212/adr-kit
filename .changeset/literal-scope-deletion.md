"adr-kit": minor
---

Fail the pre-commit hook when a staged deletion removes a file named by a
record's literal `paths:` entry.

- A glob entry keeps governing the files that remain, so only deleting the
  literal file the record names strands the scope. Updating the record's
  `paths` in the same commit, as a rename requires, passes.
- The hook derives deletions from the index in one diff call instead of
  treating an unreadable staged blob as deleted, so a large staged asset is
  never reported as a deletion.
