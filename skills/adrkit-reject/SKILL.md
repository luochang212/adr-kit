---
name: adrkit-reject
description: Use when a formal proposal is declined and its rejection rationale should be retained.
---

# ADR Kit Reject

Read the proposal and check its alternatives. Run `adrkit reject <name> --reason "<why declined>"`. It moves the dated file from `proposed/` to `rejected/`, stamps the lifecycle date, and preserves the record and reason. A rejected proposal gets no ADR number. Do not use rejection to erase a settled but merely unshipped choice; that remains proposed.
