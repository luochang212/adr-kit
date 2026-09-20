---
"adr-kit": minor
---

Record every decision a grilling session settles, with no record-time
importance filter: the session is itself the importance signal, and the ADR bar
now governs only the direct `decide`/`propose` path. The `adrkit-grill`
contract says so explicitly, and the reading rule and workflow docs split the
rule into the grill path and the direct path.

Pin the upstream `mattpocock/skills` grilling directory and add a hard CI gate:
`npm run check:upstream` fails on push and pull request when the upstream path
changes, and `npm run grilling:diff` shows the change for review. The check
never auto-syncs the adaptation.
