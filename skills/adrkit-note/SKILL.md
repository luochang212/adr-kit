---
name: adrkit-note
description: Use when you notice a choice future work must live with but cannot shape a record right now — park it as one line in the buffer and keep moving; the buffer is counted until shaped.
---

# ADR Kit Note

The note buffer is the one-line legal action at the settle moment: capture first, shape later — the quality gate stays with propose, grill, and record.

Run `adrkit note "<one line>"`; it appends a timestamped line to `adr/notes.md`, creating the file on first use. The buffer is a plain file outside the lifecycle — no front matter, no template, no number — and `adrkit validate` ignores it: notes are debt, not authority, and never a fifth lifecycle folder. Shape one when the moment allows — `adrkit propose` and `adrkit grill` read the buffer as candidate material, and `adrkit record` takes an already-shipped choice straight from it — and delete a line that shaped nothing. `adrkit list` and `adrkit instructions` count the unshaped lines so the debt stays visible.


When a source is already available, retain a PR/discussion link, commit, or attributed statement in the same line; capture must stay cheap and a source is optional. Distinguish a settled choice from a candidate needing confirmation, for example `Candidate: use SQLite; rationale unknown; source: PR #42`. Do not create alternatives or infer who decided from a transcript author, Git identity, or approval. Before shaping a note, inspect its source and resolve unknowns; a note proves neither a choice nor delivery.
