---
"adr-kit": minor
---

- Records now carry YAML front matter instead of `Status:`/`Date:` header
  lines. Status and date live only in the front matter (canonical field
  order `status`, `date`, `reason`, `superseded-by`); the `# ADR:` title
  stays as the H1 of the Markdown body. `reason` is required on rejected
  records and forbidden otherwise; `superseded-by` is required on
  superseded decisions and forbidden otherwise. Unknown front matter keys
  are preserved by lifecycle rewrites and reported by `validate`. This is
  a breaking format change: records written in the old header-line format
  no longer parse. The project has no released user base yet, so no
  migration path is provided. Updated the parser, validator, templates,
  commands, skills, docs, and test fixtures together.
