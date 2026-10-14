---
"adr-kit": patch
---

Canonicalize the Git toplevel and the ADR root through the native realpath before scope filtering, so Git-based retrieval still reports changed paths on Windows where the temp directory reaches Node and git under different spellings (8.3 short names).
