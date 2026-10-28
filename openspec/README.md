# OpenSpec material (frozen)

This tree is historical. OpenSpec is not part of ADR Kit's runtime or
governance model (see the repository README and ADR 18): the authoritative
decision record is `adr/`, and the current CLI is `docs/cli.md`.

The files under `specs/` describe the design as it stood before later
decisions replaced it. In particular:

- `specs/archive-integrity/` requires a `MANIFEST.json` seal that ADR 30
  replaced with Git history; `docs/upgrading.md` tells users to delete old
  manifests.
- `specs/decision-graph/` and `specs/deliberation-tree/` document
  `adrkit graph` and `adrkit tree`, which ADR 33 and ADR 36 consolidated
  into `adrkit atlas --map` and `adrkit atlas --record`.
- `specs/cli-option-surface/` says `--out` belongs to `adrkit graph`; it
  belongs to `adrkit atlas` now.

Do not implement these specs. New choices belong in `adr/`. The change
archives under `changes/archive/` are kept because records cite them as the
deliberation behind a decision.
