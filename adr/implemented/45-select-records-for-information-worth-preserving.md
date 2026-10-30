---
status: implemented
date: 2026-10-30
description: Read when selecting which choices deserve records or stopping
  routine records from creating ongoing maintenance obligations.
raised-by: human
decided-by: human
created: 2026-10-30
paths:
  - src/core/tool-integrations.ts
  - src/core/repository.ts
  - src/core/hook.ts
  - src/commands/instructions.ts
  - src/core/decision-atlas.ts
  - test/hook.test.ts
  - test/commands.test.ts
  - site/public/llms.txt
  - skills/**
  - test/integrations.test.ts
  - AGENTS.md
  - adr/README.md
  - docs/workflow.md
  - docs/zh/workflow.md
  - docs/recording-evaluation.md
  - README.md
  - README.zh.md
---

# ADR: 45 Select records for information worth preserving

## Problem

The maintainer reports agents recording routine adr-kit upgrades and visual
adjustments, then treating those records as precedent for further records and
repeated synchronization. This is attributed field feedback, not a reproduced
cross-model success-rate measurement. Inspection confirms that capture skill
descriptions name dependencies and defaults, and ADR 4 explicitly requires all
grilling outcomes to be recorded. The existing maintenance rules can amplify
an initial selection mistake. Formatting validation cannot determine whether a
well-written record carries useful missing information.

## Decision

Use ADR Kit as an agent-selected notebook. Select important constraints and
reasons that code, tests, and existing documentation cannot reliably preserve.
The maintainer identified importance, impact breadth, longevity, resistance to
becoming stale, and hiddenness, particularly context held only in conversation.
These are judgment dimensions, not a score or five mandatory gates. The agent
implements them through three questions: what would be lost, what forgetting
would cost, and what stable choice and reason should survive. Paired examples
separate routine upgrade/style events from hidden constraints in those domains.

Apply that judgment to direct capture, note shaping, proposal promotion, review,
and grilling, including commit-hook and instructions reminders. Skipping is valid without a declaration or per-skip approval;
notes do not require eventual ADRs. Respect explicit user preservation requests
without extending them to similar edits. Existing records are not precedent.
Changes within implementation freedom need no update unless an actual claim
becomes false; required paths and references remain valid. Report burdensome
volatile details and suggest trimming them to their existing owner or authorized
archival. Do not silently change a choice, ignore constraints, delete records,
or archive them without authorization.

This partially replaces ADR 4's unconditional grilling capture and the equivalent
requirements in ADR 3 and ADR 18: preserve a complete session tree with a
qualifying record; if none qualifies, summarize in conversation without a record.
ADR 4 remains active for its upstream pin and drift gate. ADR 1's adapted skill,
ADR 7's tree grammar, ADR 18/20/30's lifecycle, ADR 21's capture surfaces and note
buffer, ADR 24/35's user-owned standing orders, and ADR 32's objective-validation
boundary remain. No semantic CLI validator, new field, lifecycle state, dependency,
or automatic retirement mechanism is introduced.

## Alternatives considered

- Only reiterate maintenance cost: insufficient; that wording already exists,
  while descriptions and unconditional grilling still encourage over-capture.
- Keyword bans or a mandatory quality score/justification field: rejected in the
  discussion because topic names do not determine information value and agents
  can fill a ritual with plausible prose.
- Automatically retire low-value records: rejected because it can override user
  intent. Existing archival is available after an authorized judgment.
- Retain unconditional grilling capture: rejected because discussion alone does
  not establish durable information value; full trees still preserve context
  when a session produces a qualifying record.

## Consequences

### Verification

Generated skills and commands on both integration targets carry the selection
questions and examples. The integration tests protect distribution, optional
no-record outcomes, and the promotion/review boundaries; they do not measure
model judgment. Source and exported skills agree. Standing orders, generated
repository README and local copies, bilingual workflow/README and upgrade
guidance agree. Build, typecheck, the full unit suite and repository validation
pass. The manual scenario protocol covers valuable hidden
context, routine edits, explicit preservation requests and misleading precedents.
It has not been run as a cross-model experiment; no measured “90-point” quality
claim is made. The unauthenticated upstream drift check initially received
HTTP 403. An authenticated retry verifies the
upstream pin is unchanged; the vendored method and pin are unmodified. This
working-tree delivery is not an npm publication.

### Trade-offs

Instruction quality does not guarantee agent compliance. Conservative selection
can miss useful context; examples, severe-local-impact cases and explicit-user
exceptions counter that risk. Existing volatile claims still need correction
until their owner authorizes a different treatment. A full deliberation tree may
contain temporary details; marking them as context avoids independent obligations.
Automated tests demonstrate distribution and regressions, not model judgment;
the manual evaluation protocol is not a completed cross-model experiment.
