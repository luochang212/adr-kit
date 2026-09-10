---
"adr-kit": minor
---

Remove the two forward-compatibility affordances the config and record
rewriter carried for future versions that do not exist yet.

- `AdrKitConfig` no longer exposes `raw`, the parsed `config.yaml` document
  kept "for forward compatibility". Nothing read it, and `adrkit config`
  never printed it. Dropping it also fixes a crash: an empty `config.yaml`
  made `map.toJSON()` return `null`, and the old `{ raw }` initialization
  then threw on the first property access.
- `stampLifecycleMove` (used by `accept`, `reject`, and `supersede`) no longer
  copies front matter keys outside `FRONT_MATTER_ORDER` through a rewrite. A
  key this version does not understand is now dropped instead of written
  back, because silently carrying it forward hides a version mismatch rather
  than surfacing it. `adrkit validate` still reports unknown keys, so a
  record is corrected before any lifecycle move rewrites it.
- No compatibility shim is provided: the project has no users yet.
