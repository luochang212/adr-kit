---
status: implemented
date: 2026-10-31
description: Read when defining which files citation validation reads, or which
  preconditions guard archiving and superseding a record.
raised-by: agent
decided-by: human
created: 2026-10-31
paths:
  - src/core/markers.ts
  - src/core/git.ts
  - src/commands/archive.ts
  - src/commands/supersede.ts
---

# ADR: 46 Read citations from the Git index and refuse retirements that would strand them

## Problem

The citation gate disagreed with the repository twice. It read citations by
walking the filesystem, so directories Git ignores were still scanned: a local
archive of other checkouts kept at the repository root made every `validate`
and `status` read more than a thousand source files and spend tens of seconds
before answering, and a citation inside such a copy would have failed
validation for code nobody checks out. Separately, `archive` and `supersede`
moved a record without looking at the code that cites it, so both commands
could report success and leave `adrkit validate` failing on `@adr N` lines the
same command had just invalidated. `implement` already refuses an unready
promotion for the same reason; the two retirement commands did not.

## Decision

Define the repository, for citation validation, as what Git carries: tracked
files plus untracked files no ignore rule excludes, restricted to those under
the project root. Fall back to walking the filesystem only when Git cannot
describe the directory (an extracted tarball, a copy without `.git`). Symlinks
stay unread in both paths.

Before moving a record, `archive` and `supersede` scan the same corpus for
`@adr N` naming that decision and refuse, listing every `path:line`, until the
citations are repointed or removed. A citation must name a live decision, so
this is the state the caller has to reach anyway; refusing before the move
keeps the repository valid at every step instead of after a second command.
`supersede` additionally refuses a successor whose number is lower than the
record it replaces: numbers follow creation order, so a lower-numbered
successor can only produce a backwards chain that no validation rejects.

## Alternatives considered

- **Add the offending directory to the skip list**: rejected. It fixes one
  name in one repository and leaves every other ignored tree scanning; the
  disagreement is about the definition of the repository, not one path.
- **Warn after archiving and let the next validate report the citations**:
  rejected. The command would report success while knowingly writing a state
  its own gate rejects, and the caller would learn about it from a later run.
- **Rewrite `@adr N` to the successor's number automatically**: rejected. The
  successor's `paths:` may not cover the citing file, so the rewrite can create
  a different validation error, and a citation is a claim the code owner makes.
- **Compare `created` dates instead of numbers in `supersede`**: rejected.
  Numbers are the stable order the atlas and the record format already use;
  dates are day-granular and cannot order two records created the same day.

## Consequences

### Verification

Files Git ignores are not read for citations; a repository without Git is
still scanned by walking it. `archive` and `supersede` refuse with the citing
`path:line` list, and succeed once the citations are removed. A successor with
a lower number is refused. Both refusals leave the record tree untouched.

### Trade-offs

A citation in an ignored file is no longer checked. That is intended: the file
is not part of what anyone else checks out, so it is not a place a decision is
claimed to be followed. A repository that keeps real sources in an ignored
directory would lose coverage; the fix is to track them, which is what sharing
them requires. The retirement scan costs one pass over the corpus per
`archive`/`supersede`, and it reads the working tree, so a citation staged but
not written to disk is invisible to it.

