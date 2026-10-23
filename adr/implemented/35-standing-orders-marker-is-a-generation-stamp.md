---
status: implemented
date: 2026-10-23
raised-by: human
decided-by: human
created: 2026-10-23
tags:
  - agent-integration
  - governance
paths:
  - AGENTS.md
  - src/core/tool-integrations.ts
  - test/integrations.test.ts
  - test/commands.test.ts
  - skills/adrkit-init/SKILL.md
  - README.md
  - README.zh.md
  - site/src/i18n/ui.ts
---

# ADR: 35 Standing-orders marker is a generation stamp

## Problem

The standing-orders marker was added as a drift signal. The existing
`standingOrdersSection` comment already describes reconciliation with a template
generation, and a command test calls it current by declaration. That meaning
was not consistently explained in user guidance: `STANDING_ORDERS_MARK` is the first eight hex digits of
SHA-256 over the canonical template body (`src/core/tool-integrations.ts`),
and the template ends with `<!-- adrkit: standing-orders <mark> -->`.
`standingOrdersDriftNote` reads AGENTS.md, extracts that marker with a regex,
and compares only the token (`src/core/tool-integrations.ts`); it
does not extract or hash the pasted section body.

The resulting behavior has three states, verified in a throwaway repository
against 0.25.0:

- no marker: "predate template marking" note;
- old marker: "pasted from a different template" note;
- current marker with an edited body: no note.

So "fingerprint" describes the template, not the pasted section. This
repository demonstrates the gap: its AGENTS.md body hashes to `af45d6a9`
while its marker is `449bd66b`, and `adrkit list` stays quiet. v0.24.0 was
already mismatched (`dad65478` vs `5a4faf4e`). The check detects template
generations, not body equality.

The maintainer reported a sibling repository adopting the full template during
an upgrade instead of preserving its shorter local rules. That observation
motivated this change, but does not establish that the marker forced full
adoption: a locally edited body with the current marker already stays quiet.
The issue is unclear guidance, not an enforced body-integrity contract.

Absence is treated as drift too. A repository deliberately maintaining an
untracked local section gets the same note as an installation predating
marking. It cannot opt out of generation tracking simply by omitting the
marker. Clarifying the marker and making tracking optional are separate
choices: the latter deliberately gives up the migration nudge for old,
unmarked installations.

Origin: the maintainer raised the marker's meaning after reviewing a sibling
repository's upgrade; the agent measured the three states, the two body hashes,
and the code path. The direction — generation stamp plus opt-in absence — is
the maintainer's; this record captures that direction.

## Decision

The marker is a template-generation declaration: it records which canonical
template the local standing orders were reconciled against, not body equality.
The existing eight-hex id is still derived from the canonical body. Translation,
shortening and local edits are supported; the CLI reads AGENTS.md without
rewriting it (ADR 24).

Generation tracking is opt-in: an unmarked section is quiet; an old marker
produces a note; a current marker is quiet even with local edits. Missing
standing orders retain their separate init/update note. The old-generation
note asks the reader to compare and reconcile changes before re-stamping.

The init workflow, code comments, bilingual upgrade guidance and homepage FAQ
explain the same contract. The canonical section body and hash input are
unchanged. This links ADR 21's exposure surface and preserves ADR 24's carrier
and ownership boundaries; neither record is superseded.

## Alternatives considered

- **Keep the current contract and only fix the wording**: rejected. It leaves
  absence as drift, so a repository that deliberately omits tracking still
  carries a permanent note. A short or translated section can already be
  reconciled and stamped; that does not provide an opt-out.
- **Remove the marker and never check**: rejected. The stale section in the
  sibling repository was found because an old marker produced a note; without
  either a marker or a text diff there is no in-band signal, and AGENTS.md is
  read on every task.
- **Hash the pasted section and compare it**: rejected. Translations and local
  edits are legitimate; byte equality would flag them without establishing
  whether their rules are adequate.
- **Have the CLI rewrite the section**: rejected. Preserve the existing user-owned,
  read-only boundary. ADR 24 continues to own the sole-carrier choice.
- **Use a human-readable version or date instead of the hash**: viable, but it
  requires a marker migration and manual bumps. The opaque token already
  changes with the template; keep it for this change and revisit only if the
  opacity keeps causing misreadings.
- **Make the marker mandatory but add a custom marker variant**: rejected. It
  adds a second format and a second meaning for the same comment; opt-in
  absence is simpler and puts the choice in the file.
- **Do nothing**: rejected. The user guidance does not clearly explain the declaration
  already expressed in code, and unmarked sections cannot opt out of tracking.

## Consequences

### Verification

- Command tests exercise init, update, list, instructions and relevant for
  unmarked, old, current, edited and translated sections. Init/update preserve
  AGENTS.md bytes; absent or unrelated instructions retain the missing-section
  note.
- Workflow/template mirrors remain synchronized. The local dogfood marker
  remains current, and README guidance explains the deliberate change for old
  unmarked installations.
- Typecheck, command/integration tests, CLI build and ADR validation pass.

### Trade-offs

- Unmarked installations lose the migration nudge. Repositories opt in by
  reconciling their section and retaining the marker.
- The CLI does not verify that a human or agent actually compared the text.
  Local adaptation is intentional; byte equality would not establish adequacy.
- The id is opaque. Wording explains the declaration; no strict mode or new
  marker format is introduced.
