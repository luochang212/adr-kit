---
'adr-kit': minor
---

**BREAKING**: Remove the `--json` output mode from every command. `adrkit list`,
`status`, `instructions`, `validate`, `config`, and `graph` now print text only,
and `--json` is rejected as an unknown option.

The mode was a template inheritance from the project's first commit, kept because
the tool it was modeled on had one rather than because anything read it. The
records are the interface: plain Markdown with YAML front matter that an agent
reads directly, with `validate` as the machine check.

- Deleting the flag also deletes `JSON_COMMANDS` and the hand-written "does not
  support `--json`" rejection, which existed only to police an option declared
  globally but implemented by a subset of commands.
- `graph` keeps its three outputs: `--mermaid` (default), `--dot`, and `--text`.
- `--help` and `--version` answer for themselves again. They are meta-flags
  rather than commands, so they print and exit 0 even beside another flag; only
  `--decided-by` on a real command is still rejected.
