---
"adr-kit": minor
---

Detect drift between the CLI and the installed skills. `init` and `update`
stamp `installed-with:` into `adr/config.yaml` with the version that wrote the
integrations; `list` and `instructions` compare it against the running CLI,
and `config` reports the stamp. When they differ, `list` and `instructions`
append a one-line
note — a newer CLI suggests `adrkit update` to refresh the skills, an older
one says to upgrade — so a stale install explains itself instead of failing
later with an error that names no cause. Repositories configured before the
stamp existed stay quiet, and an explicit integrations opt-out never nags.
