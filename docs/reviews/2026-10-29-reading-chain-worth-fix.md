# Reading-chain findings: worth fixing?

Assessed on 2026-10-29 against the current working tree. This is an assessment,
not an implementation. Relevant authority: ADR 3 (optional deliberation),
ADR 20 (lifecycle reading), ADR 22/23 (scope retrieval), and ADR 44
(descriptions select records; paths remain deterministic).

## Worth fixing: show includes optional deliberation

**Confirmed; low-severity context overhead; local change, no refactor.**
`src/commands/show.ts` reads and returns the entire file. Selecting a decision
therefore loads its optional design tree even when the task needs only the
decision body. ADR 3 explicitly excludes this appendix from the mandatory full
read. This is an output-default improvement, not a claim that the current
documented command fails to return a record.

Direct reproduction through the production function, after `npm run build`:

```sh
node --input-type=module <<'JS'
import { showCommand } from './dist/commands/show.js';
const output = showCommand('7', process.cwd());
console.log('includes optional appendix:', output.includes('\n## Deliberation\n'));
JS
```

Observed: `true`. Across all eight implemented records containing deliberation,
the appendix accounts for approximately 13–33% of current show output characters.
This measures text volume, not model tokens, latency, or answer-quality gains.

Trigger probability is certain when show reads a record with that appendix;
impact is limited to those reads; implementation cost is small; leaving it
unchanged repeatedly spends context on optional material. Prefer showing the
complete main record, retaining source-path access to the original file. No new
command, flag, record format, or separate storage is needed. Existing atlas
rendering must continue to read the full source.

If implemented, preserve this scenario as a regression test with inverted
expectation, alongside tests that preserve required sections, ignore heading
examples inside code fences, and retain any non-deliberation section after the
appendix. Removing everything after a substring match is not a sufficient fix.

## Do not build a new mechanism for extra reading

**Extra reading confirmed; generalized defect claim only partially supported.**
The previous six independent, read-only Codex sessions loaded 4–7 complete
records each. That count alone does not establish waste: privacy, audit, and
configuration records can legitimately constrain a task indirectly.

There is a concrete avoidable example: the payment task executed
`adrkit show 18` after the fixture's inventory exposed both a site-only path and
the description “Read only when changing the static website checkout animation;
it does not govern real billing or payments.” The answer correctly excluded
that record's rules from real payment behavior. The historical-credentials
task also read the Redis proposal and acknowledged it was unrelated.

Thus excess context is observed, while resulting decision errors were not.
Occurrence frequency beyond these runs and the benefit of stronger instructions
are unknown. A forced read budget or semantic filtering could suppress needed
cross-cutting records. Do not add either. Do not accumulate more mandatory
instructions merely to discourage a few extra reads; a small wording change
would need a controlled rerun before claiming an improvement.

## No demonstrated retrieval repair is needed

All six sessions read the predefined mandatory bodies and applied the core
constraints correctly. The new-file case recovered a global, unscoped decision
after a zero-match path query. Eight packed-CLI checks passed, including missing
description validation, rejection of tags, lifecycle preservation, archive
successor discovery, and explicit truncated-search failure. A fresh
`node bin/adrkit.js validate --all` also passed during this assessment.

This supports retaining description + paths + list/relevant/show. It does not
prove universal recall, establish a success rate, or show that descriptions
outperform titles: there was one valid run per case and no description-free
control. No implementation work, multi-client comparison, or large-corpus model
test was performed in those six sessions.

The raw experimental report, commands, JSONL events, and fixture scripts are at
`/tmp/adrkit-scenario-eval.iaBg9g/`; those are temporary local evidence. The
production-function reproduction above remains usable independently of them.
No runtime code was changed in this assessment.

## Implementation follow-up

The user subsequently requested the local fix. `show` now uses the existing
Markdown scanner to omit actual level-two Deliberation sections, retaining the
source path, front matter, all other content, and original line endings. No
source record is rewritten; no new CLI option or command was added. This
implements ADR 3's optional-reference boundary rather than choosing a new
record architecture.

The regression first failed against the original implementation for LF and CRLF
records, then passed after the fix. Coverage includes a terminal proposal
appendix, subsections inside the omitted appendix, later sections, heading
examples in backtick/tilde fences and HTML comments, and source preservation.
The reproduction above now prints `false` as expected.

Validation: 758 unit tests passed, one skipped; typecheck, build, repository
validation, and diff whitespace checks passed. The compiled CLI was also checked
against real ADR 7: show retains Decision and omits Deliberation, the source is
unchanged, and `atlas --record 7 --format text` still renders the tree. Bilingual
README, CLI reference, upgrade notes, and a changeset describe the output change.
