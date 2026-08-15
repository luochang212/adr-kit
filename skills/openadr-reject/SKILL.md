---
name: openadr-reject
description: Use when a proposed ADR should be declined and frozen for future reference.
---

# OpenADR Reject

## Overview

Reject a proposal. The CLI moves the file from `adr/proposed/` to
`adr/rejected/` and rewrites the status line with the reason.

## Steps

```bash
openadr reject "<name>" --reason "<why it was rejected>"
```

## Rules

- Always provide a concrete reason; the command refuses an empty one.
- A rejected record is frozen history. Do not edit it afterwards.
