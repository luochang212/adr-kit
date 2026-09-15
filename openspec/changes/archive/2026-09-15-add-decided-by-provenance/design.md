## Context

See `proposal.md` — Why. The relevant current state:

- The front matter contract is centralized: `FRONT_MATTER_ORDER` in
  `src/core/adr.ts` is the canonical field list, `frontMatter()` in
  `src/core/templates.ts` emits only the keys present, and
  `stampLifecycleMove()` rewrites a front matter block by keeping only
  canonical keys — a non-canonical key is dropped rather than copied.
- `src/core/validate.ts` treats unknown front matter keys as errors
  (`frontMatterExtras`), and already distinguishes a parser-enforced shape
  from a validator-enforced rule, the way `created` is optional to the
  parser and required by `validate`.
- `src/core/` must stay independent of `console` and `process.argv`
  (AGENTS.md), which is where the environment probe has to live to be
  testable.
- Adding a canonical field is a cross-cutting change: the seven
  `skills/adrkit-*/SKILL.md` files mirror `src/core/tool-integrations.ts`
  byte-for-byte under `test/integrations.test.ts`, and the format reference
  is duplicated across two README languages, two doc languages, and the
  site.

## Goals / Non-Goals

**Goals:**

- One inferred, machine-stamped field that answers human-versus-machine
  without recording identity.
- Deterministic placement and validation, so `validate` can fail a durable
  record that omits it and a draft that carries it.
- Keep every existing invariance: no new runtime dependency, no
  forward-compatibility shims, and no command that silently rewrites a
  record it was not asked to move.

**Non-Goals:**

- Attesting or proving the origin. This design buys the end of accidental
  mislabeling, not tamper resistance; the spec requires the limit to be
  documented rather than engineered away.
- Recording who acted. Identity stays in git (author, committer, trailers).
- Recording the decision path (draft-then-promote versus direct record).
  That remains inferable from the record's own history and is deliberately
  not widened into this field.
- Reconstructing origins for records that predate the field.
- Changing the decision graph. The graph reads `superseded-by` and
  references; it neither needs nor gains a provenance edge.

## Decisions

### D1: A front matter field, not a body line or a git-derived inference

A record-level field is the only option that travels with the record when
the file is read on its own, which is the property the format already
extends to `date` and `commit`. A body line would be unstyled prose that
`validate` cannot check deterministically; deriving the axis from the commit
identity fails precisely where it matters, because agent sessions commit as
the human user. Recorded as the field, the axis survives on the artifact and
the identity question stays delegated to git.

### D2: The value is stamped from the environment, never passed in

If the origin can be supplied as an argument, the field records a claim
instead of an observation, and an agent can satisfy it correctly by
accident. Making the value a side effect of running the command keeps the
writer honest about the one thing it can actually observe: the session it
runs in. Consequence: no `--decided-by` flag exists, and an unknown option
is rejected by the existing `parseArgs` CLI, which already errors on
unrecognized flags rather than ignoring them.

### D3: Canonical position between `date` and `created`

`date` states when the current status was reached and `created` states when
the record was born, so a field that describes the status-taking event
belongs with `date`. Order carries meaning in this format (the README
promises canonical order), and placing it after `created` would read as a
birth attribute, which it is not: a draft carries no value and is stamped
only when it takes effect.

### D4: `supersede` preserves the value; only creation and promotion stamp

The field answers "who made this decision", not "who last touched this
file". Re-stamping on retirement would destroy the answer at the moment the
record becomes frozen history, and it would make the field's meaning depend
on which command ran last. The replacement decision is stamped on its own at
record time, so a supersession carries two independent values: the origin of
the retiring decision and the origin of the decision that replaced it.

### D5: Exactly two values, no `unknown`

A third value would migrate the question from "human or machine" to "did the
detection run", and a tri-state enum in a machine-checked format invites
indefinite `unknown` records that satisfy validation while answering
nothing. Every run can decide: a detectable agent session means `machine`,
and its absence means `human`. The residual error (a human working inside an
agent shell is labeled `machine`) is documented, and it errs in the safe
direction.

### D6: Detection is a marker probe in a new `src/core/execution-env.ts`

The probe reports `machine` when any known agent session marker is present
in the environment — `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`,
`CURSOR_TRACE_ID`, `CODEX_SANDBOX`, `AI_AGENT`, `AGENT` — and `human`
otherwise. It is a pure function of an environment mapping passed in, so
tests drive both branches without mutating the real process environment, and
it imports nothing from `process.argv`. The marker list is data, not
behavior: extending it is a one-line change with a test.

### D7: Validation requires the field on durable records and rejects it on drafts

This mirrors `created`: the parser accepts the field's absence so that the
format contract stays about shape, and `validate` enforces presence where
the lifecycle says it must exist. For drafts, the field is rejected outright
rather than ignored, because a draft is outside the durability boundary and
silently accepting the key would invite writers to believe it survives
promotion.

### D8: Promotion ignores any draft-supplied value by construction

`proposalToDecision()` builds new front matter from a fixed field map, and
`stampLifecycleMove()` keeps only canonical keys, so a hand-written
`decided-by` in a draft has no path into the decision. No extra stripping
code is required; the existing invariant does the work, and a test pins it.

### D9: No back-fill, documented migration

Given the choice between a validator failure and a machine inventing
provenance for a past decision, the failure is the correct outcome: a
fabricated origin is the exact artifact this capability exists to prevent.
Release notes carry the one-line migration for adopters.

## Risks / Trade-offs

- **The stamp is inferable, not attested** → The spec requires the
  record-format reference to state the inference, rank it below the observed
  `date` and `commit`, and list how it is defeated. Detecting deliberate
  masking is explicitly out of scope; a team that needs attestation must
  sign commits, which git already supports and this field does not replace.
- **A canonical field multiplies the mirror surface** → The change ships
  whole: skills and `tool-integrations.ts` in the same commit as the
  parser, because `test/integrations.test.ts` fails on drift. The task
  breakdown sequences the mirror last so the tests fail loudly if it is
  skipped.
- **Required-field strictness breaks existing adopters** → Documented in
  release notes; the tool never writes the value for them. The repository
  has no released adopters of a durable decision log yet, so the blast
  radius is currently one format rule.
- **A mislabeled human-in-agent-shell reads as `machine`** → Accepted and
  documented. The reverse error, a machine recorded as `human`, is the one
  that would undermine the field, and the probe errs away from it by
  stamping `machine` whenever any marker is present.
- **Precision loss between the two paths** → `machine` on a directly
  recorded decision and `machine` on a promoted draft mean slightly
  different things. Accepted for a binary field; the path stays
  reconstructable from the record's `created` date and draft history, and a
  later capability can add a path field without changing this one.
- **A new field changes the emitted front matter of every new record** →
  Expected and desired; snapshots in the command tests are updated in the
  same change, and existing records are untouched.

## Migration Plan

1. Land the format change with the field required by `validate` and stamped
   by `decide`/`accept`.
2. Users re-run `adrkit validate`; accepted records recorded before the
   upgrade report a missing `decided-by` and are fixed by the user, by hand,
   with the value they know to be true.
3. Rollback is a version pin: removing the field from the canonical order
   makes it an unknown key, which `validate` reports, so a downgrade is
   visible rather than silent. No record is ever rewritten by the downgrade.
