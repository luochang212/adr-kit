---
'adr-kit': minor
---

`decided-by` now records who decided — a person or the agent's own judgment —
declared by the caller instead of inferred from the environment.

- The field answers one question: where did this choice come from? `human` when
  a person determined the direction — they stated it, changed an agent's
  proposal into what shipped, or the choice is being recorded after the fact.
  `agent` when the direction came from the agent's own judgment, including when
  a person only let it through without engaging with the choice. It carries
  exactly one value and is never co-signed; who proposed, redirected, or
  approved belongs in the record body.
- `adrkit decide` and `adrkit accept` require `--decided-by human|agent` and
  refuse to write a record without it. There is no default and no inference:
  the CLI cannot observe who chose, and the old probe measured a different
  question (who ran the command), so it recorded every unrecognized agent as a
  person. The probe and the marker list are deleted, not deprecated.
- The format allows exactly `human` or `agent`; any other value, including the
  removed `machine`, fails to load with an error naming the two. Nothing
  normalizes or back-fills it: `validate` reports a missing or unknown value and
  never rewrites a record.
- `propose` writes nothing and takes no declaration. `supersede` preserves the
  declared value instead of asking for a new one: retiring a decision does not
  change who made it.
- `--decided-by` and `--json` are rejected wherever they are not accepted,
  `--help` and `--version` included. Those two so far printed and exited 0
  before the rejection ran, so a mistyped flag looked like a success.
- `adrkit list --json` exposes `decidedBy` on every record that carries one, so
  the machine-readable surface is not missing the field the human-readable one
  is built around.
- Completion declares the value-taking options (`--tag`, `--tools`,
  `--workflows`, `--by`, `--reason`) as taking a value, so bash, zsh, and fish
  stop offering the option list where the CLI is waiting for a value; zsh also
  gains a fallback branch instead of silently completing nothing.
- The installed skills tell agents how to declare: `human` when the person
  determined the direction, `agent` when the choice came from the agent's own
  judgment even if a person let it through, and to ask the person when they
  genuinely cannot tell.
- The record-format reference in both languages, both READMEs, the CLI help and
  its required-option prompt, the generated repository README, the site copy,
  and the `decision-provenance` spec state the same boundary and its limits.
