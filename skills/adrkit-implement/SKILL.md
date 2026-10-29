---
name: adrkit-implement
description: Use when a proposal has shipped and should become a numbered, active decision.
---

# ADR Kit Implement

Promotion is what makes `implemented/` trustworthy authority — shipped guidance rather than intent — so later tasks can rely on what they read in full.

Confirm the proposal's work is shipped, not merely accepted for review. Compare the record's claimed paths, names, defaults, and mechanisms with the current code and tests, and check the active records for overlap with this choice: a full replacement is promoted and then resolved with `adrkit supersede --by` in the same change, while a partial replacement keeps the older record active and links both. Run `adrkit show <name>` and `adrkit validate <name>`; resolve errors. Then run `adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>`. The command assigns the next stable ADR number, rewrites proposal sections into a shipped decision, moves the record from `proposed/` to `implemented/`, and preserves `created` and `description`. It folds acceptance criteria into `### Verification` and risks into `### Trade-offs` under `## Consequences`; it warns because the CLI cannot rewrite prose. Rewrite those subsections as present-tense shipped facts, inspect the generated Decision and Consequences for proposal-era language, then validate the numbered record. Do not infer the two provenance declarations from the command runner.
