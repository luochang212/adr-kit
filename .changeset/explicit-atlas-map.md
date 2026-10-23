---
"adr-kit": minor
---

Breaking: visualization formats no longer select the generated object. `adrkit atlas --format html --out adr.html` now writes the full decision atlas. Standalone maps require `--map`, for example `adrkit atlas --map --out map.html` or `adrkit atlas --map --format mermaid`. Non-HTML formats without an explicit map or record are rejected with a corrective hint. Map filters require `--map`; single-record trees now also default to HTML and accept `--format html|mermaid|text`. The `--diagram` flag is removed. Atlas rejects positional arguments and points record queries to `--record <name>`. File-output receipts now identify the object, format, and absolute path; stdout without `--out` remains the artifact alone. Refresh agent integrations with `adrkit update` after upgrading.
