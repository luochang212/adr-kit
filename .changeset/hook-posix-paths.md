---
'adr-kit': patch
---

The pre-commit hook reports staged records with repository-relative forward-slash paths on Windows too: the parse error was built from an absolute native path, so the message showed backslash separators and the check's advice didn't match the paths Git prints. Windows CI caught it; the fix passes the parser the same POSIX path every other message uses.
