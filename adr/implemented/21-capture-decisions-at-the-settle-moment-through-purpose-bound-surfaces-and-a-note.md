---
status: implemented
date: 2026-10-12
raised-by: agent
decided-by: agent
created: 2026-10-12
commit: a3072af
---

# ADR: 21 capture decisions at the settle moment through purpose-bound surfaces and a note buffer

## Problem

The reading and recording rules assume an agent that (a) knows what `adr/`
exists to prevent and (b) recognizes the settle moment when it happens. An
agent that merely has ADR Kit installed has neither. Right-moment recording
decomposes into notice × associate × cheap-enough, and the current surfaces
fail the last two terms.

Association fails because every exposure surface speaks tool vocabulary, not
the agent's situational vocabulary. The standing-orders template opens with an
instruction ("At the start of a coding, design, or review task ... run
`adrkit list`") and nowhere states the two failure modes `adr/` exists to
block: drifting from long-term decisions while over-focused on the current
task, and forgetting settled choices until they resurface as inconsistencies.
The capture-side skill descriptions are category phrases ("Use when starting
an architectural choice that has not shipped") that require the agent to first
classify its situation into the tool's category — and that classification step
is exactly where misses happen, because mid-task the agent thinks "I'm just
picking a cache strategy", not "I am making an architectural choice".

Cheap-enough fails because the only legal capture actions are shaped ones:
`propose` demands five sections of genuine content under a validation gate,
and `grill` interrogates the user. An agent that correctly notices and
correctly associates still faces a detour against work in flight, rationally
defers, and deferral is where capture dies. The quality bar is right for
records and wrong for the spontaneous moment; the tension is structural. A
worth-fix verification measured the gate directly (2026-10-12): an empty
`propose` draft fails validation on three required sections, and `record`
is worse mid-task — one title lands an empty record straight in
`implemented/`, burning a stable number before its sections hold content.
No legal action leaves the repository valid at one line of cost.

No active decision covers either term. ADR 17 deferred the task-end check — an
enforcement-shaped nudge — and its evidence window has since closed positive — three archives, three
inventory actions, zero falsifying traces (ADR 19 recorded from the
close-agent-note-governance-loop archive; ADRs 18 and 20 from the
four-folder changes; the 2026-10-11 archive documents the explicit "checked,
nothing to record" form) — nothing binds the tool's purpose to its name at the surfaces agents actually
read, and nothing gives the settle moment a one-line legal action.

## Decision

Two coordinated moves, both shipped: Phase 1 in the purpose-surface change
(21bed9e), Phase 2 with the note buffer (a3072af). The maintainer raised the
problem and the awareness framing; the agent derived the friction term and
this design.

**Phase 1 — purpose-bound, situation-mirrored surfaces.**

- Add one framing sentence at the top of the standing-orders template binding
  the tool to its failure modes, in the spirit of: "`adr/` exists because
  agents over-focus on the current task and forget settled decisions: reading
  it at task start counters the drift, and recording when a choice settles
  counters the forgetting." One line per surface, varied wording, never
  verbatim duplication. The line adds meaning to existing obligations and
  introduces no new action, respecting the constitution-density discipline
  behind ADR 17's deferral.
- Rewrite the capture-side skill descriptions (`propose`, `record`, `grill`)
  in situational language that mirrors the agent's state at the moment
  (`propose` in the first person; `record` and `grill` situation-naming) — "when you catch yourself settling a trade-off future work must
  live with (a dependency, format, boundary, or default) and `adr/` does not
  already own it" — because in skill-retrieval agents the description is the
  only retrieval key, and it is matched against the situation, not the
  category.
- Add one purpose line at the top of each skill body, one in the generated
  `adr/README.md` (`INIT_README`), and one in `adrkit instructions` output.
  Update both mirrored sides (`src/core/tool-integrations.ts` and
  `skills/`) and this repository's dogfooded `AGENTS.md` and `adr/README.md`
  in the same change.

**Phase 2 — a zero-shape note buffer (shipped: `src/core/notes.ts`, `src/commands/note.ts`, the `adrkit-note` skill).**

- `adrkit note "<one line>"` appends a timestamped line to `adr/notes.md`,
  creating the file on first use. It is a plain file: no front matter, no
  template, no lifecycle semantics, and `validate` ignores it. It is
  explicitly not a fifth lifecycle folder (ADR 18).
- `adrkit list` and `adrkit instructions` surface an "N unshaped notes" count
  so shaping becomes visible debt; `grill`'s inventory step and `propose`'s
  pre-write check read the buffer as candidate material.
- The quality gate stays exactly where it is: shaping through
  `propose`/`grill`/`record` retains the five-section bar and validation
  failures as success signals. Separating capture from shape protects the
  record set from hollow capture-by-urgency as much as from non-capture.
- Ships with a situation-mirrored `adrkit-note` skill, a completion entry,
  bilingual README command documentation, and tests.

Relationships: links ADR 17 — same write-side gap, complementary mechanism;
this proposal does not reopen the deferred task-end sentence, whose positive
evidence gate makes it that record's own follow-through. Links ADR 20 — the
framing line lands in the surfaces the context contract binds. Links ADR 18 —
the buffer is declared outside the lifecycle. The `grill`-surface wording
changes touch the skills ADRs 1 and 4 govern without altering their
decisions.

## Alternatives considered

- **Copy layer alone (association without affordance)**: rejected. Awareness
  that meets a five-section detour still defers; the legal action at the
  settle moment must cost one line.
- **Note buffer alone (affordance without association)**: rejected. An agent
  that never associates never invokes it; the description that must trigger
  `note` is itself part of the association layer.
- **Lower the propose/record shape bar** (shorter templates, laxer
  validation): rejected. It trades away the product contract that validation
  failures are success signals; the right resolution of the quality-versus-
  capture tension is separating capture from shaping, not weakening shape.
- **Fold in ADR 17's task-end check sentence**: rejected. It is separately
  owned recorded follow-through with its own closed evidence gate; folding it
  into an unrelated change would override a recorded decision and muddy
  attribution.
- **Platform Stop hooks or other mechanical triggers**: rejected, per ADR 17's
  portability analysis; nothing here changes that verdict.
- **A path-keyed retrieval surface (`adrkit why <path>`)**: rejected for now.
  Read-side discovery with unfixable recall — constraint-level decisions
  constrain files they never name, and an empty result licenses skipping.
  Revisit only if dogfooding shows concrete read-misses.

## Consequences

### Acceptance criteria

- Phase 1: the standing-orders template, `INIT_README`, `adrkit instructions`
  output, and every skill body carry exactly one purpose line each, with no
  verbatim duplication across surfaces; the capture-side descriptions are
  rewritten situationally; `src/core/tool-integrations.ts` and `skills/`
  remain byte-mirrored with the integration test green; this repository's
  `AGENTS.md` and `adr/README.md` are refreshed in the same change; a test
  asserts the framing line survives template regeneration.
- Phase 2: `adrkit note` has a round-trip test covering append, the `list`
  count, and `instructions` surfacing; `validate` ignores `adr/notes.md`;
  shell completion includes the subcommand; `README.md` and `README.zh.md`
  document it; the `grill` and `propose` skill texts reference the buffer.
- Both phases: `npm test`, `node bin/adrkit.js validate --all`, and
  `npm run check:upstream` pass.

### Risks

- **Constitution density.** The framing line could become noise agents skip.
  Mitigation: one line per surface, varied wording, no new action — the same
  discipline that justified deferring the task-end check.
- **Description drift.** Situation-mirrored descriptions must stay
  retrieval-honest or they oscillate between trigger spam and false quiet.
  Mitigation: the sync test pins both sides; revisit wording if dogfooding
  shows misses.
- **The buffer becomes a graveyard** of notes never shaped. Mitigation: the
  count is surfaced where agents already look (`list`, `instructions`), the
  archive-time inventory channel can include it, and deleting a buffer line
  is cheap unlike deleting a hollow record.
- **Attribution.** New awareness surfaces muddy future behavioral reads of
  the archive-guidance experiment. The window already closed with three
  positives, so the confound lands after the verdict, not before it.
- **Scope.** Phase 2 adds a command to a one-dependency CLI. Mitigation: the
  primitive is append, count, and surface — no parsing sophistication — and
  the buffer is a plain file.


## Deliberation

- Q: What does right-moment recording require? [settled]
  - A: notice × associate × cheap-enough [settled] — the failure decomposes; prior decisions covered neither back term
    - A: the association layer alone [rejected] — deferral dies at the five-section gate
    - A: the friction layer alone [rejected] — no trigger without association
    - A: both, phased [settled] — copy first, command second; each stands if the other is struck
    - Q: Where does the association live? [settled]
      - A: retrieval keys plus one framing line per always-on surface [settled] — descriptions are matched against the situation
        - A: an education-heavy AGENTS.md essay [rejected] — density; the ADR 17 discipline applies
        - A: code-comment anchors pointing at records [rejected] — invasive, dual-maintained, read-side anyway
    - Q: What is the cheapest legal capture action? [settled]
      - A: one-line append to a non-lifecycle buffer [settled] — capture and shape stay separate
        - A: a bare or flag-gated `propose` [rejected] — weakens the validation contract
        - A: hand-written scratch files without a command [rejected] — same friction, no surfacing
      - Q: Does the buffer get lifecycle semantics? [settled] — no: a plain file, or it becomes a fifth folder against ADR 18
- Q: Exact wording of the mirrored descriptions? [open] — maintainer review against trigger honesty
- Q: Does Phase 2 wait for dogfood evidence of Phase 1? [settled] — no: the archive window closed positive (three archives, three inventory actions), Phase 1 shipped in the purpose-surface change, and a worth-fix pass measured the five-section gate and confirmed the buffer stays outside every existing scan path; each phase still stands if the other is struck
