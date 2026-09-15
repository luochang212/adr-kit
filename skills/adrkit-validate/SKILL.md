---
name: adrkit-validate
description: Use when checking whether ADR files follow the ADR Kit format, especially before accepting a proposal or committing.
---

# ADR Kit Validate

## Overview

Run the machine checks for one record or the whole repository.

## Steps

```bash
adrkit validate [name] [--all] [--json]
```

- With no `name`, the whole repository is validated.
- `name` resolves by title, file name, or decision number.

## Rules

- Treat any non-OK output as a blocker for `adrkit accept`.
- A `front matter must include "decided-by"` issue on a record that predates
  the field is not yours to repair: report it and let a human supply the
  value, because only they know who initiated that decision.
- `adrkit validate` checks durable decisions only; a draft in `adr/.drafts/`
  is validated by `adrkit accept` right before it is promoted.
