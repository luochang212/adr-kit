---
"adr-kit": minor
---

Record dependency in the `## Deliberation` appendix by nesting: a follow-up
question is a child of the node whose settlement raised it, so related questions
run deeper and unrelated ones stay flat. `adrkit tree` styles the edge that
raised each follow-up question so the tree's depth reads as the frontier, wraps
long labels, and shows a legend in the `--html` view.
