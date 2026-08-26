---
'adr-kit': minor
---

Removes the per-vendor integration whitelist. `adrkit init` now installs the
vendor-neutral `.agents/` integration by default (skills plus slash
commands), which every mainstream agent reads; Claude Code - the one agent
that scans only `.claude/` - is an explicit exception via `--tools claude`.
