---
"adr-kit": patch
---

- Records now carry a `Date:` header line that records when the current
  status was reached. The CLI stamps it at every lifecycle move
  (`propose`, `decide`, `accept`, `reject`, `supersede`), so the date is
  machine-written and never drifts or goes stale. `validate` additionally
  checks the calendar validity of the date (for example `2026-02-31` is
  rejected). This is a format change: records without the `Date:` line no
  longer parse. The project has no released user base yet, so no migration
  path is provided.
