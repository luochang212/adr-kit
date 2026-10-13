---
"adr-kit": minor
---

Scope records to file paths: a new optional `paths:` front matter field (repo-relative globs; `**` crosses separators, `*` stays in a segment, `?` matches one character) turns each record into a retrievable scope, and `adrkit relevant <path>...` retrieves the records whose scopes govern a file or directory, grouped by reading posture so agents read the governing implemented records in full and proposed and rejected ones with the right caution.

`adrkit validate` now fails a `paths:` entry whose static prefix no longer exists on disk, catching scope drift the moment a file moves or a path is typoed — except on archived records, whose sealed bytes must not depend on the live tree. The field and the command are mirrored through both READMEs, the record-format and CLI references, the workflow guides, the standing orders in the agent integrations, and the `adrkit-init` and `adrkit-review` skill mirrors.
