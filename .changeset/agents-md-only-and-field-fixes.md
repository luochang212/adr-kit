---
"adr-kit": minor
---

Carry standing orders in AGENTS.md only: Claude Code reads AGENTS.md natively since v2.1.277 and no other tool reads CLAUDE.md, so the init workflow pastes into AGENTS.md alone and the missing-section note no longer counts a CLAUDE.md carrier (ADR 24). Standing-orders detection gains a language-neutral anchor — the task-start `adrkit list` command survives translation, so a fully localized section no longer trips the note. `adrkit show` sizes its underline by East Asian display width and resolves a numbered record by its number-stripped title, the form `adrkit list` prints and prose quotes. `adrkit propose` and `adrkit record` print a one-time `paths:` scoping tip, and fresh drafts state the pointer rule: volatile facts belong to an owner next to the code, not in the record.
