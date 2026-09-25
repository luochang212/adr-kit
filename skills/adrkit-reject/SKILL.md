---
name: adrkit-reject
description: Use when a formal proposal is declined and its anti-pattern should be recorded.
---

# ADR Kit Reject

Read the proposal and check its alternatives. Run `adrkit reject <name> --reason "<the tempting mistake this blocks>"`. It moves the dated file from `proposed/` to `rejected/`, stamps the lifecycle date, and preserves the record and reason. A rejected proposal gets no ADR number. `rejected/` is a durable terminal record of a declined proposal — not a graveyard and not a cache: keep it, and remove it only when another record owns the warning it blocks, never merely because it seems stale. Its reason names that warning. Rejections are unnumbered and unsealed, so removing a redundant one cannot reuse a number or break the archive. Do not use rejection to erase a settled but merely unshipped choice; that remains proposed.
