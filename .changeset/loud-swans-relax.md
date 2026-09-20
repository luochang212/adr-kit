---
"adr-kit": patch
---

Align `adrkit init`'s config template with the yaml library's flow-array
emission (`tools: [ agents ]`, `workflows: [ a, b ]`, `[]` when empty), so a
bare `adrkit update` no longer rewrites a freshly initialized
`adr/config.yaml` (`[agents]` -> `[ agents ]`) and manufactures a spurious
diff. Existing compact configs normalize once at the next update, then stay
byte-stable.
