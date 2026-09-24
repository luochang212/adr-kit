---
name: adrkit-implement
description: Use when a proposal has shipped and should become a numbered, active decision.
---

# ADR Kit Implement

Confirm the proposal's work is shipped, not merely accepted for review. Compare the record's claimed paths, names, defaults, and mechanisms with the current code and tests, and check the active records for overlap with this choice: a full replacement is promoted and then resolved with `adrkit supersede --by` in the same change, while a partial replacement keeps the older record active and links both. Run `adrkit show <name>` and `adrkit validate <name>`; resolve errors. Then run `adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>`. The command assigns the next stable ADR number, rewrites proposal sections into a shipped decision, moves the record from `proposed/` to `implemented/`, and preserves `created` and `tags`. Inspect the generated Decision and Consequences so they state shipped facts rather than proposal-era intent, then validate the numbered record. Do not infer the two provenance declarations from the command runner.
