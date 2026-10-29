---
"adr-kit": minor
---

Harden the lifecycle and the atlas output after the 2026-10-29 whole-repository
review.

- The full atlas payload's `title` no longer repeats the ADR number, and its
  body keeps exactly one `# ADR: N <title>` line, so directory cards and the
  reader stop showing the number twice.
- The Chinese atlas localizes the generated map's lifecycle text
  (`被 ADR N 替代`, `已归档`) and its `aria-label` instead of leaving English
  inside the translated page.
- `record` and `propose` reject a title containing a line break and parse the
  generated file before writing it, so a bad title can no longer leave an
  unreadable record that makes `list` and `relevant` fail.
- `init` repairs a partially initialized repository (missing config, lifecycle
  folder, or README) instead of refusing, and the "no repository" error names
  the missing config and the repair command. Repair preserves existing
  integration commands, skills, and resources, creating only missing files;
  use `update` explicitly to refresh existing integrations. A repair that kept
  files leaves `installed-with` absent and explicitly prompts for `update`,
  rather than claiming the preserved files were written by the current version.
- Each lifecycle move takes one date stamp, so `date`, `created`, and
  `archived` cannot straddle midnight and contradict each other.
- `paths` scopes reject a trailing slash: `src/` validated but never matched.
  Use `src/**` to scope a directory. Breaking for records that carry such a
  scope.
- `## Deliberation` now accepts `*` and `+` bullets, ignores fenced examples and
  HTML comments (including fences indented within the outline), and reports a
  missing section, an empty section, and a non-outline body as different errors.
- zsh completion no longer prints `undefined` for `--record`, `--format`, or
  `--lang`, and `adrkit config` shows an explicit `tools: (none)` opt-out.
