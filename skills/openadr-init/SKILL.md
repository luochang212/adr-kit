---
name: openadr-init
description: Use when initializing OpenADR in a repository or when the agent cannot find an adr/ directory.
---

# OpenADR Init

## Overview

Create an `adr/` repository in the target directory.

## Steps

1. Decide the target directory (default: current working directory).
2. Run:

```bash
openadr init [path]
```

3. Confirm the output lists `adr/config.yaml`, `adr/decisions`,
   `adr/proposed`, and `adr/rejected`.

## Rules

- Never create `adr/` directories by hand; use the CLI so the config and
  README stay canonical.
- After init, the next action is usually `openadr propose "<title>"`.
