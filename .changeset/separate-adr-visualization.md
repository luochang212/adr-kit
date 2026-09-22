---
"adr-kit": minor
---

Split viewing existing ADRs into the `adrkit-visualize` workflow, leaving
`adrkit-grill` focused on questioning and recording decisions. Install it with
`adrkit init` or `adrkit update`, or select `--workflows visualize`.
Visualization requests now open the generated HTML in the default browser and
also return a file link; file-only requests and unavailable browsers retain the
link without requiring a separate opening request.
The visualize workflow writes the map with `--out`, so its record links
resolve against wherever the file lands — a temporary directory included.
