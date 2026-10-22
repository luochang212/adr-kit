---
'adr-kit': patch
---

The installed pre-commit hook fails closed with a message naming the remedy when the CLI entry it pins is gone — reinstall with `adrkit hook install`, remove the hook with `adrkit hook uninstall`, or bypass once with `git commit --no-verify` — instead of surfacing a bare Node module-loader error.
