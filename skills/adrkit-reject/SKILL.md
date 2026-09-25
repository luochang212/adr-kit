---
name: adrkit-reject
description: Use when a formal proposal is declined and its anti-pattern should be recorded.
---

# ADR Kit Reject

Read the proposal and check its alternatives. Run `adrkit reject <name> --reason "<the tempting mistake this blocks>"`. It moves the dated file from `proposed/` to `rejected/`, stamps the lifecycle date, and preserves the record and reason. A rejected proposal gets no ADR number. `rejected/` is anti-pattern memory, not a graveyard: keep a rejection only while its reason still blocks a plausible, meaningful mistake, and delete the record once it no longer teaches — rejections are unnumbered and unsealed, so removing one cannot reuse a number or break the archive. Do not use rejection to erase a settled but merely unshipped choice; that remains proposed.
