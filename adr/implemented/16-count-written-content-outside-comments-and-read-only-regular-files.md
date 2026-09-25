---
status: implemented
date: 2026-09-23
raised-by: agent
decided-by: human
created: 2026-09-23
commit: 6ec0049
---

# ADR: 16 Count written content outside comments and read only regular files

## Problem

The validator's guarantees held only for honest input. `hasMeaningfulBody`
stripped HTML comments with a backtracking expression that matched only closed
comments, so a section carrying a lone `<!--` counted as written: a draft whose
every required section held one marker was reported ready to accept, `accept`
promoted it, and the resulting empty record then passed `adrkit validate`. The
same expression cost the square of the body's size when markers never close —
468 KB took 11.4 s in the bare regex, and a 1.9 MB record hung `validate`,
`status`, and `instructions` past 30 s. The reader also read whatever the path
resolved to: a FIFO blocked forever, hanging `list` and `show` (the two
commands `AGENTS.md` tells every agent to run at task start) along with
`status`, `validate`, `instructions`, `decide`, `graph`, and `tree`, and a
symlink to `/dev/zero`, which git can carry as mode 120000, read without end at
~420 MB RSS after 12 s. ADR 2 makes `validate` this repository's real gate and
`AGENTS.md` calls validation failures success signals; a gate a marker passes
and a file can wedge is neither.

## Decision

- **Written content is text outside HTML comments.** An unterminated `<!--`
  swallows the rest of the section, which is CommonMark's reading of a comment
  block that reaches its end of context. The rule lives in one function
  (`hasMeaningfulBody`) and applies to every "must contain written content"
  check and to the mandatory-alternative rule, on drafts and durable records
  alike.
- **The strip is a single linear scan**, `indexOf` from each `<!--` to the next
  `-->`, so reading and validating a record cost work bounded by its size. A
  crafted body is reported like any other validation failure instead of
  consuming the machine.
- **A path read as a record must resolve to a regular file.** A directory,
  FIFO, socket, or device is refused with the kind named in the message, before
  any read. The check follows symbolic links — a link to a regular file stays a
  record — and lives in `parseAdrFile`, the single chokepoint every reader
  parses through (`listRecords`, `listProposals`, `resolveRecord`, `resolveProposed`).
- **No size cap on records, and no race check.** A large committed regular file
  is a slow but bounded read, and an arbitrary limit would refuse legitimate
  records; git and review are the control there. A path swapped between the
  check and the read is out of scope: the threat is a crafted file in the tree,
  not a local adversary racing the CLI.

## Alternatives considered

- **Keep the expression and cap the body length**: rejected. It picks an
  arbitrary constant to avoid ten honest lines, and a cap that fires on a
  legitimate large record is a worse failure than the one it prevents.
- **Keep treating an unterminated marker as text** (the previous behavior):
  rejected. That is precisely what let a section of nothing but markers pass as
  written content.
- **`lstat` and refuse every symbolic link**: rejected. It breaks records that
  are symlinks to regular files and work today, to stop a harm that lives in
  the resolved target, which a `stat` already sees.
- **Skip a path that is not a regular file silently**: rejected. A record that
  exists but is not read is the drift this tool exists to prevent; the failure
  is reported instead.
- **Adopt the whole upstream hardening checklist** (config values injecting
  into generated instructions, registry redirection of the upgrade check):
  rejected after testing. Config never reaches the integration files, which are
  static test-enforced mirrors, and the upgrade notice makes no network call.
  The two classes that do apply are the ones above.

## Consequences

- A draft that used an unterminated marker as scratch space now fails
  `adrkit implement` with `section "## X" must contain written content`, and a section whose only
  text sits inside a comment is reported by name. The failure is the point: the
  gate exists to stop a record nobody wrote.
- Reading is bounded. A 1.9 MB crafted body validates in 0.27 s and reports the
  missing content, where it previously ran past 20 s, and a FIFO in
  `adr/implemented/` makes every affected command return in ~0.3 s naming the
  kind instead of blocking.
- The error text for a missing or dangling path changed from the raw
  `ENOENT ... open` form to `record path cannot be read: ...`; no test or doc
  pinned the old wording.
- `docs/record-format.md` and `docs/zh/record-format.md` state the content
  rule; `docs/cli.md` and `docs/zh/cli.md` state the regular-file requirement.
  This repository's own records validated unchanged under the tightened rule,
  so no migration was needed.
- Future readers inherit the constraint: new code that reads a record goes
  through `parseAdrFile` or repeats the regular-file guard.
- The agent's audit raised the defects and proposed the fix; the maintainer
  directed the work and approved the plan unchanged, so `raised-by` is `agent`
  and `decided-by` is `human`. The OpenSpec change
  `harden-validation-inputs` carries the planning trail, and its delta adds the
  `validation-integrity` capability.
