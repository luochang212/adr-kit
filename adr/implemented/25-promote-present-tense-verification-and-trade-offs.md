---
status: implemented
date: 2026-10-18
description: "Read when promoting proposal acceptance criteria and risks into verified facts and trade-offs of a shipped decision."
raised-by: agent
decided-by: agent
created: 2026-10-18
commit: d202911
paths:
  - src/core/adr.ts
  - src/core/templates.ts
  - src/core/validate.ts
  - src/commands/implement.ts
  - src/core/tool-integrations.ts
  - skills/adrkit-implement/SKILL.md
  - test/adr.test.ts
  - test/validate.test.ts
  - test/lifecycle.test.ts
  - test/commands.test.ts
  - test/docs.test.ts
  - test/integrations.test.ts
  - docs/record-format.md
  - docs/zh/record-format.md
  - README.md
  - README.zh.md
  - adr/implemented/20-define-the-four-lifecycle-folders-as-a-context-contract.md
  - adr/implemented/21-capture-decisions-at-the-settle-moment-through-purpose-bound-surfaces-and-a-note.md
  - adr/implemented/22-scope-records-to-file-paths-for-retrieval-and-drift-checking.md
  - adr/implemented/23-make-scope-retrieval-completeness-explicit-across-path-and-git-inputs.md
  - adr/implemented/24-carry-standing-orders-in-agents-md-only.md
---

# ADR: 25 Promote acceptance criteria and risks into present-tense verification and trade-offs

## Problem

`adrkit implement` folds a proposal's `## Acceptance criteria` and `## Risks`
into `## Consequences` as `### Acceptance criteria` and `### Risks`. Both are
proposal-era headings, and the record-format reference says proposal-era
sections must not remain in an implemented decision. The mismatch is
systematic rather than incidental: the generator produced it in five
implemented records before this change. Implemented records are current
authority read in full, so a shipped decision that still reads like a plan
weakens the folder's central claim. The generator is the source; manual edits
are the exception.

## Decision

- `proposalToDecision` emits `### Verification` for the proposal's acceptance
  criteria and `### Trade-offs` for its risks, both under `## Consequences`.
  An empty or comment-only proposal section emits no subsection; when both are
  empty, the existing `_No consequences recorded._` fallback remains.
- `implement` prints one warning when either section was folded, naming the
  new subsections and requiring the author to rewrite them as present-tense
  shipped facts before validation. The CLI cannot rewrite prose.
- `validate` rejects `### Acceptance criteria` and `### Risks` directly under
  `## Consequences` in `implemented/` records, outside fenced code and HTML
  comments. The check is deliberately narrow: H3 only, exact heading text,
  Consequences only, implemented only. Custom sections and other heading
  levels are not policed; the CLI proves the known old shape, not all prose.
- The five existing records migrated in the same change: the two subsections
  were renamed and their prose reviewed and brought into the present tense
  without changing the decision or rationale. Archived records stay frozen.
- No adoption date, grandfather marker, or format field. The rule applies
  immediately by owner decision: the real user is currently the maintainer,
  so upgrading is self-service and no compatibility path is carried. The known
  repository with the old shape, `article-helper` (adr-kit 0.18.1, six records,
  twelve headings), renames them on upgrade; the error names the replacement,
  so the fix is mechanical.
- This is the project's standing compatibility stance, not a one-off: ADR 18
  rejected preserving old command and file compatibility, and ADR 3 states
  compatibility is not a constraint for this self-used pre-stable package.
- The record-format references and both READMEs, the `adrkit-implement`
  skill and its `tool-integrations.ts` mirror, and the tests are updated.

ADR 18 remains active and owns the lifecycle and promotion decision; this
record refines its rewrite output. ADR 19's boundary — the CLI proves
structural facts while review owns tense and meaning — bounds the narrow
check.

The agent raised the mismatch from the DeepSeek Harness notes review; the
maintainer set the no-forward-compatibility premise and delegated the final
tradeoff, which the agent resolved by narrowing the gate to the known old
shape under Consequences.

## Alternatives considered

- **Keep `### Acceptance criteria` / `### Risks` and relax the docs**:
  rejected. It would make implemented records read like proposal-era intent
  permanently and contradict the current-authority contract.
- **Promote `## Verification` to a top-level section**: rejected. It expands
  the canonical section skeleton for a detail that belongs with consequences;
  the H3 fold keeps the required H2 set stable.
- **Ban all five proposal-era headings at H3–H6 everywhere**: rejected after
  real-usage review. `### Risks` can be a legitimate subsection of a bespoke
  section; the broad rule would need a preflight to stop `implement` writing
  a record it rejects, and it would police prose beyond the old generator
  shape.
- **Gate by adoption date or a grandfather marker**: rejected. There are no
  real users to protect; the date/marker machinery is complexity without
  current value.
- **Only fix the generator, with no validator rule**: rejected. It fixes new
  promotions but lets old or copied records reintroduce the exact shape. The
  narrow check is cheap and does not reach into custom sections.
- **Add a prose heuristic for `should` / `will`**: rejected. The CLI proves
  structure; tense and meaning stay with the author and review (ADR 19).

## Consequences

### Verification

- `adrkit implement` on a proposal with acceptance criteria and risks writes
  `### Verification` and `### Trade-offs` under Consequences, never the two
  proposal-era headings, and warns that the body must be rewritten in the
  present tense.
- `adrkit validate` fails an implemented record with `### Acceptance criteria`
  or `### Risks` directly under Consequences, and passes the same heading
  under another section, inside a fence, inside a comment, in a proposed or
  rejected record, or in an archived record.
- The five migrated records validate and still state their original
  decisions; archived bytes are unchanged.
- The skill and `tool-integrations.ts` mirror stay byte-synchronized; both
  record-format references and both READMEs describe the new shape; `npm
  test`, `npm run typecheck`, `npm run build`, and `adrkit validate --all`
  pass.

### Trade-offs

- **Content drift in the migration.** The five records' subsections were
  renamed and their prose reviewed for tense; a careless edit can change the
  decision. Mitigation: change only headings and tense, review each diff, and
  keep the choice and rationale intact.
- **The narrow gate leaves variants.** `### Proposal` / `### Plan` or
  `#### Risks` under Consequences can still slip. That is deliberate: the rule
  targets the old generator shape without policing bespoke structure. Revisit
  only if real records show broader drift.
- **No forward compatibility.** Existing records with the old H3 shape fail
  after upgrade. That is accepted: the real user is currently the maintainer,
  and the one known repository with the old shape is `article-helper` (adr-kit
  0.18.1, six records, twelve headings); it renames them on upgrade. The
  failure names `### Verification` / `### Trade-offs`, so no date guard or
  migration command is carried. A future external adopter would need a
  migration note or a major bump.
- **False positives under Consequences.** A deliberate `### Risks`
  subsection under Consequences now fails; the error names `### Trade-offs`
  so the fix is obvious. This is accepted to keep the old shape out.
- **The warning is easy to ignore.** The CLI cannot rewrite prose; the skill
  and review carry the tense obligation. Mitigation: one warning at
  promotion, explicit documentation, and a test for the generated headings.


## Deliberation

- Q: What is the actual failure? [settled]
  - A: the generator emits proposal-era H3s under Consequences, and the docs say they must not remain. [settled]
- Q: What shape should promotion produce? [settled]
  - A: fold into `### Verification` + `### Trade-offs` under Consequences. [settled]
    - A: top-level `## Verification` [rejected] — expands the canonical skeleton.
    - A: keep the old H3s [rejected] — contradicts current authority.
- Q: Which surfaces change? [settled]
  - A: implement only; propose and record templates stay unchanged. [settled]
- Q: How strong is the gate? [settled]
  - A: narrow H3 under Consequences, exact text, implemented only. [settled]
    - A: all five proposal-era headings at H3–H6 [rejected] — false positives and a preflight hole.
    - A: no gate [rejected] — old or copied records can reintroduce the shape.
- Q: Compatibility? [settled]
  - A: none; no date, marker, or format field. [settled]
- Q: What about the five existing records? [settled]
  - A: migrate headings and tense in the same change. [settled]
- Q: Where does the decision live? [settled]
  - A: a new ADR linked to ADR 18; ADR 18 stays active. [settled]
