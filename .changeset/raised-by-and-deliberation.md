---
"adr-kit": minor
---

Add a required `raised-by` provenance field alongside `decided-by`: who put a
decision on the table versus whose judgment settled it. Add a `## Deliberation`
appendix that stores a grilling session's design tree as a nested outline, with
the new `adrkit tree <name> [--mermaid|--text]` command to render it. Grilling
now ends in `adrkit decide` only (the `grill -> propose` path is removed), and
`decide` leads the product's hints and website demo while `propose` stays the
supported exception.

This is a breaking record-format change: every durable record must carry
`raised-by`, and `adrkit decide` / `adrkit accept` require the new
`--raised-by` flag.
