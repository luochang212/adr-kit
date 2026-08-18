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
- A fresh draft is expected to fail until the required sections are
  filled in; fix the exact issue printed rather than deleting sections.
