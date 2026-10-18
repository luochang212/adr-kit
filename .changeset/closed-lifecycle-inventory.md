---
'adr-kit': minor
---

Reject records outside the four lifecycle folders. Repository validation now fails an unknown folder under `adr/`, a record at the `adr/` root, and a nested folder inside `proposed/`, `implemented/`, `rejected/`, or `archived/`, so a misplaced record cannot disappear from `list` and `relevant`. Section parsing also ignores `##` headings inside fenced code blocks, so a documented example no longer becomes a duplicate section and fails validation for the wrong reason.
