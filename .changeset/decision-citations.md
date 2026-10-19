---
"adr-kit": minor
---

Add `@adr <number>` citations in code and configuration files. `adrkit validate --all` now fails when a citation names a missing, archived, or superseded decision (naming the successor), or when the citing file sits outside that decision's `paths`. Citations are optional; Markdown is not scanned.
