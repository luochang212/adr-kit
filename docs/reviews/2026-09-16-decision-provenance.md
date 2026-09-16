# Decision provenance review — 2026-09-16

Reviewed commit `42eb97a` using worth-fix. All three reported inconsistencies
were reproduced; each is low severity and cheap to correct without refactoring.

| Finding | Evidence and disposition |
| --- | --- |
| VHS demo omitted the required declaration | Executing its `decide` command against the built CLI exited 1 with `--decided-by is required`. Added `--decided-by human`; all three tape commands now succeed in a temporary repository and create one decision. |
| Website transcript omitted the agent hint | Compared the scripted output with the real `proposeCommand` result. Added the missing line; the complete proposal output now matches after normalizing the example date. |
| Spec promised promotion of an invalid draft | Calling `acceptCommand` on an otherwise valid draft carrying `decided-by: human` rejected it and preserved its contents. Corrected the spec to require removal of the invalid field first; retained the existing validation gate. |

The command-level regression in `test/commands.test.ts` now proves rejection
leaves the draft unchanged and creates no decision, then proves correction
allows promotion with the caller's `agent` declaration. All 29 command tests
and the website build pass. VHS commands were exercised, but GIF rendering and
browser visual layout were not checked.

Rejecting legacy `machine` values and requiring a declaration are intentional
compatibility breaks documented in the spec and changeset, not defects to undo.

## Follow-up: shell completion

The subsequent completion changes failed real zsh Tab completion after the
title. The handler now shifts to the subcommand's words and cursor position
before parsing its options. A zpty regression exercises command names, option
names, quoted titles, and both space-separated and equals-form declarations.
The Bash test now points its cursor at the option prefix it claims to test.

Fish declarations now use `-x` (a required argument without filename candidates)
and omit the duplicate optional declaration. A real Fish completion test is
included but skipped locally because Fish is not installed; its runtime behavior
was not verified here. The full suite passes 169 tests with that one skip;
typecheck, build, and diff whitespace checks also pass.
