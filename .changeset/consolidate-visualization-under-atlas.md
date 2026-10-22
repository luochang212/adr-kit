---
'adr-kit': minor
---

Replace `adrkit graph` and `adrkit tree` with one visualization command, `adrkit atlas` (ADR 33). With no flags it writes the decision atlas — the default answer to an unqualified visualization request. `--record <name> --diagram` renders one decision's deliberation card tree, `--format mermaid|dot|text` exports the relationship map's source (`--tag` and `--formal-only` still filter it), `--format html` emits the standalone map page with its output-path link resolution, and `--out` writes any mode. `graph` and `tree` are rejected as unknown commands; scripts must use the new modes. The README upgrade section names the replacements.
