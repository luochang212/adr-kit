# Design

## Context

See proposal.md for the reproduced failures and scope. `readConfig` currently selects valid fields and silently omits invalid ones. `validateRepository` catches configuration syntax errors but receives no field-type diagnostics. Task-start commands deliberately tolerate unreadable config through `readConfigSafe`.

Both `archiveCommand` and `supersedeCommand` write the archive, append its seal, then call `removeRecord`. Their existing rollback covers a failed seal write, not a failed source deletion. ADR 19 requires sealed history to stay frozen.

## Goals / Non-Goals

Provide field-specific validation errors and state-specific lifecycle errors with tests against real repositories. Preserve existing tolerant reads, successful command output, and archive seals.

Exclude unknown-key restrictions, rule semantics, generic diagnostic schemas, automatic cleanup, transactional rewrites, and new dependencies or CLI flags.

## Decisions

### Keep config diagnostics separate from tolerant reads

Use one config inspection function to parse YAML, extract valid fields, and collect type diagnostics with the same type checks. `readConfig` returns the effective config from that inspection, while repository validation consumes its messages through the existing issue format. Keep `readConfigSafe` behavior compatible; no second schema or parser is introduced.

Validate only explicitly present fields, including null as an invalid value for these known types. Lists require string elements; `rules` requires a mapping whose values are string lists. Empty lists and mappings remain valid. Diagnostics name zero-based item indexes; mapping-valued rule items receive a quoting hint. Render user-provided field names safely, without terminal control sequences. Do not interpret the contents of rule strings or reject extension keys.

Making every config read throw was considered and excluded: it would broaden this fix into changing unrelated commands. A new validation dependency is unnecessary for this small schema.

### Diagnose the source-removal phase locally

Catch only source removal after successful sealing in both archive-capable commands. Include source and archive paths and the underlying failure, then explain inspection, permission repair, preservation of unique content, removal of only the duplicate active source, and validation. Keep earlier write/seal failures on their existing paths.

Do not roll back or rewrite a committed seal to make the command look atomic. Do not remove the source automatically after an error. These alternatives risk altering frozen history or losing changed source content; an accurate diagnostic is sufficient for this fix. Two short command-local catches are acceptable; extract shared wording only if it materially reduces duplication without hiding phase ownership.

### Exercise actual failure boundaries

Config tests use real YAML and the production validation path. Lifecycle tests inject failure into the actual source-removal call after sealing, scoped to one source path, rather than relying on platform-specific permissions. Assert both retained files, the seal, the diagnostic, unchanged replacement for supersede, and successful validation after removing the confirmed duplicate. Restore any mocks after each test. Preserve the existing failed-seal rollback test.

## Risks / Trade-offs

- Previously ignored mistyped config now fails validation → valid configurations, absent optional fields, unknown keys, and tolerant reads remain compatible; document the stricter validation.
- Fault injection could fail before reaching the intended phase → assert the final archive bytes and manifest entry before accepting the test result.
- Both copies remain after source-removal failure → state the ambiguity explicitly and document manual recovery; do not claim atomicity.
- Config diagnostics could accidentally validate advisory rule meaning → test structural types only and retain arbitrary string content.
