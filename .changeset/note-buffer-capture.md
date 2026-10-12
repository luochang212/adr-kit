---
"adr-kit": minor
---

Give the settle moment a one-line legal action: `adrkit note "<text>"` appends a timestamped line to `adr/notes.md`.

The buffer is a plain file outside the lifecycle — no front matter, no template, no number — and `adrkit validate` ignores it: capture and shape stay separate, so the record format keeps its validation-failures-are-success-signals contract while the spontaneous moment stops paying the five-section detour. `adrkit list` and `adrkit instructions` surface an "N unshaped notes" count so shaping becomes visible debt; the `adrkit-propose` and `adrkit-grill` skills read the buffer as candidate material, and a new `adrkit-note` skill mirrors the settle moment the way the capture-side descriptions do. Shell completion, the help synopsis, and the bilingual CLI reference document the new command.
