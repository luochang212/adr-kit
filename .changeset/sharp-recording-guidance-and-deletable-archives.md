---
"adr-kit": minor
---

Sharpen the recording guidance and let repositories shrink natively (ADR 54, 55):

- The shared recording guidance now ends in a veto test — name the concrete
  future change the record would stop; a reason that stops nothing a failing
  test would not stop is not recorded — hedges user-ruled interface values as
  code-held, and adds the observed flood categories to the leave-to-sources
  table.
- `adrkit delete` removes archived records under the same stranded-reference
  preflight, and the pre-commit hook checks staged archived deletions for
  stranded references instead of failing them categorically. The generated
  `adr/README.md` states the record-worthiness bar and the deletion reality
  instead of "never delete".
- `adrkit list` and `adrkit status` report the inventory's reading cost
  (implemented records read in full, with character totals).
- `adrkit-propose` names the close-out duty for dead proposals: reject or
  delete them in the change that kills them.
- `docs/workflow.md` gains the regrade procedure for stock recorded under an
  older bar.
