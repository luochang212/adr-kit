---
status: implemented
date: 2026-10-19
raised-by: agent
decided-by: agent
created: 2026-10-19
commit: 5ebda92
tags: [agent-integration, governance]
paths:
  - src/core/markers.ts
  - src/core/validate.ts
  - test/markers.test.ts
---

# ADR: 26 Cite decisions from code and fail validation on stale citations

## Problem

`paths:` let a record claim the files it governs, but code had no way to say
which decision it follows. A comment could keep citing a decision that had been
superseded, and a file could cite a decision whose scope excluded it; both looked
locally correct and neither failed validation. The gap was the reverse link:
records pointed at files, and files pointed at nothing.

## Decision

Code and configuration files cite the decision they follow with `@adr <number>`
in a comment — `@adr 14` or `@adr 14, 22`. `adrkit validate` scans code and
configuration files (not Markdown, not the root `site/` documentation copy)
outside `adr/`, dependency, and build directories, and fails when a citation:

- names a decision that does not exist;
- names an archived decision;
- names a superseded decision, reporting the successor that replaced it;
- sits in a file outside that decision's `paths`.

Citations are optional and only the ones written are checked; every issue names
the line. A citation to a superseded record is fixed by citing the successor,
never by editing the frozen decision. The accepted record stays immutable.

## Alternatives considered

- **Symbol-level analysis (AST, language servers)**: rejected. It is
  language-specific, adds dependencies, and would infer a link the author can
  simply declare; the citation is an assertion, not a guess.
- **Require every file in a record's `paths` to cite it**: rejected. Most
  governing files apply a decision across a module rather than at one line, and
  the requirement would trade a precise signal for blanket noise.
- **Check only Markdown and leave code unlinked**: rejected. The drift that
  matters happens in code, where the decision is applied.
- **Warn instead of fail on a stale citation**: rejected. A CI warning is
  ignored; "this decision was replaced" is a hard fact, so validation fails the
  same way it does for an invalid record.

## Consequences

### Verification

`test/markers.test.ts` proves both sides: a live citation in scope passes, and
missing, archived, superseded, out-of-scope, prose, and binary cases fail — or
stay silent — for the stated reason. The repository dogfoods the convention:
`src/core/retire.ts` cites ADR 30, `src/core/graph-html.ts` cites ADRs 9 and
11, `src/core/decision-atlas.ts` cites 29 and 31, `src/core/markers.ts` cites
this record, and a probe citing archived ADR 5 fails with "superseded by
ADR 8".

### Trade-offs

A citation can rot, and fixing it requires touching the citing code; that is the
point. A file outside a decision's `paths` now fails instead of passing
silently, so a decision whose scope grows needs its `paths` updated in the same
change. Scanning reads every code and configuration file on `validate`;
dependency trees, build output, and the root `site/` documentation copy are
skipped, and files over 1 MiB or containing a NUL byte are ignored.

Source-file or directory acquisition errors are reported as validation issues;
these failures are distinct from the deliberate scan exclusions above.
