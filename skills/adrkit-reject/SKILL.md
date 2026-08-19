---
name: adrkit-reject
description: Use when a proposed ADR should be declined and frozen for future reference.
---

# ADR Kit Reject

## Overview

Reject a proposal. The CLI moves the file from `adr/proposed/` to
`adr/rejected/` and records the reason in the front matter.

## Steps

```bash
adrkit reject "<name>" --reason "<why it was rejected>"
```

## Rules

- Always provide a concrete reason; the command refuses an empty one.
- A rejected record is frozen history. Do not edit it afterwards.
