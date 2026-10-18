---
'adr-kit': minor
---

Promote a proposal's acceptance criteria and risks into present-tense `### Verification` and `### Trade-offs` under `## Consequences` instead of the proposal-era `### Acceptance criteria` and `### Risks`; `adrkit implement` now warns that the folded content must be rewritten in the present tense. `adrkit validate` rejects the two old H3 names directly under Consequences in implemented records, while ignoring other sections, fenced code, HTML comments, proposals, rejections, and archived records. The five records carrying the old shape migrate in the same change. Existing records with the old shape fail validation; by decision, no compatibility path is carried — the real user is currently the maintainer, who renames the headings on upgrade.
