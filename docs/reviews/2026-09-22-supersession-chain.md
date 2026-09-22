# Supersession chain assessment

## Verified behavior

On a temporary copy of this repository's `adr/`, using the locally built CLI:

1. `adrkit validate` exits 0 (`OK`).
2. `adrkit supersede 8 --by 12` exits 0 and writes the lifecycle move.
3. `adrkit validate` and `adrkit validate 5` both exit 1:
   `"superseded-by: 8" references a superseded decision; supersede that decision instead`.

The temporary copy was deleted; the actual records were not changed. ADR 12
was used only to exercise the command path, not to decide whether it should
replace all of ADR 8.

## Cause and impact

`src/commands/supersede.ts` accepts retiring the currently accepted successor.
`supersedeReferenceIssues` in `src/core/validate.ts` rejects any reference whose
immediate target is superseded. Thus a successful normal lifecycle operation
can turn a valid repository into an invalid one. The command also refuses
editing already-superseded predecessors, so following its guidance cannot
repair this through the supported commands.

Tests currently enforce the immediate-target restriction. This is a semantic
inconsistency, not an accidental missing conditional. It affects successive
replacements and blocks validation without deleting record contents.

## Recommendation

Worth fixing, medium severity. Permit historical edges through superseded
records when the chain is finite, every referenced record exists, and it ends
at an accepted record. Reject missing targets, self-links, cycles, and invalid
terminal states. Preserve historical edges rather than rewriting all ancestors
to the newest decision. Continue requiring an accepted replacement when making
a new lifecycle move.

No broad refactor or new record field is needed. Update cross-record validation,
its documented contract, and affected skill guidance together. Regression
coverage should exercise two successive real supersede commands, check both
whole-repository and single-record validation, and confirm unchanged ancestor
files. Include missing targets, cycles, and longer chains as negative/positive
cases. The follow-up fix replaces the immediate-status check with iterative chain
validation. Regression tests first failed on the old implementation, then passed
for successive commands, unchanged ancestors, longer and converging chains,
missing downstream targets, self-links, cycles, and invalid terminal states.

ADR 8 and ADR 9 establish historical replacement edges in the views; ADR 12
and ADR 13 are partial policy amendments. Whether a partial amendment warrants
retiring an entire record is a separate decision from supporting valid chains.
