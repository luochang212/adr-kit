---
'adr-kit': minor
---

Add `adrkit hook <install|uninstall|run>`: an opt-in pre-commit check that fails on staged records or `@adr` citations that are objectively invalid, then reports which active decisions govern the staged files and asks the committer to record or park a choice the change settles. It never fails on "no record was written" — a hook cannot observe whether a choice was settled, so that judgment stays with the committer. `install` refuses to replace a hook adr-kit does not manage; `uninstall` leaves one untouched.

This also closes ADR 17's deferred task-end self-check instead of shipping it (ADR 32): its evidence came from one spec framework's archive step, and the commit boundary is the better check-in point. No task-end sentence is added to the standing orders.
