---
'adr-kit': minor
---

`adrkit init` and `adrkit update` accept `--workflows <list>` to install a
subset of the workflow skills (for example `--workflows init,decide,validate`
for a repository that only records decisions) instead of all seven. The subset
is recorded in `adr/config.yaml`, survives a bare `adrkit update`, and
`--workflows all` restores the full set. The `adr/README.md` template now
documents the `created` and `tags` front-matter fields, matching the current
record format.
