---
'adr-kit': minor
---

The decision atlas now renders in English by default and in Chinese with `--lang zh`; the generator translates the shipped template's chrome and builds the hero, statistics, notes, footer, and title in the chosen language, so one frontend serves both. `--lang` applies to the atlas page only; `--record` and `--format` reject it instead of ignoring it. The site build pins its own Chinese copy.
