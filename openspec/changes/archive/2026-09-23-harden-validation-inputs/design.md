## Context

See `proposal.md — Why` for the reproduced evidence. This document chooses the
mechanisms.

Current state the approach builds on:

- `hasMeaningfulBody` (`src/core/adr.ts`) is the single predicate behind every
  content check: `sectionIssues` (required sections) and `alternativesIssue`
  (`## Alternatives considered`), for both drafts and durable records. It
  strips comments with `/<!--[\s\S]*?-->/g` and asks whether anything remains.
- `parseAdrFile` (`src/core/adr.ts`) is the single read chokepoint: every
  reader — `listRecords`, `listDrafts`, `resolveRecord`, `resolveDraft`, and
  the corrupt-record fallback scan — parses through it. `readRecord` re-reads a
  path that already parsed.
- `docs/record-format.md` already documents the comment rule for
  `## Alternatives considered` ("after HTML comments are stripped"), so the
  unterminated case is an unfinished corner of a documented rule rather than a
  new rule.
- Standing constraints (AGENTS.md): `src/core/` stays free of `console` and
  `process.argv`; `yaml` stays the only runtime dependency; validation
  failures are success signals, so both sides of each rule get a test.

## Goals / Non-Goals

**Goals:**

- One definition of written content, enforced in one function.
- Work bounded by input size for any crafted record.
- One regular-file check on the way in, not one per caller.

**Non-Goals:**

- A size cap on records (see D4).
- Refusing symbolic links (see D3).
- Detecting a swap between the check and the read (out of scope in
  `proposal.md`).

## Decisions

**D1. One linear scan replaces the regular expression.** `stripComments` walks
the body with `indexOf`, skipping from each `<!--` to the next `-->`, and
returns the text outside comments. The scan is linear because each character is
visited once; the regex is quadratic because a marker with no closing tag makes
the engine rescan to the end of the body from every position. Measured on the
same 468 KB payload: 11,445 ms before, 2 ms after. *Alternative:* keep the
regex and cap the body length before stripping — rejected: it picks an
arbitrary constant, and the honest fix costs ten lines.

**D2. An unterminated comment swallows the rest of the section.** Comment
syntax follows CommonMark, where a comment block runs to the end of its
context; the context here is one section body, because sections are validated
independently and always have been. *Alternative:* keep treating an
unterminated marker as ordinary text — rejected: that is exactly what lets a
section of nothing but markers pass as written.

**D3. The guard follows the link, then requires a regular file.** A `statSync`
(not `lstatSync`) resolves the path first, so a symbolic link to a regular file
keeps working exactly as today; the check is on the resolved target's kind, and
the error names it (`directory`, `fifo`, `character device`, `socket`, `block
device`). *Alternative:* `lstat` and refuse every symbolic link — rejected: it
breaks harmless records to stop a harm that lives in the target, which the stat
already sees. *Alternative:* a size cap instead — same objection as D1.

**D4. No size cap.** A committed 100 MB regular file is a slow but bounded
read; the failure mode that needs code is unbounded work, and a cap would
refuse legitimate large records while adding a constant nobody can justify.
*Alternative:* cap at some megabyte figure — rejected as speculative.

**D5. The guard lives in `parseAdrFile`.** One check on the way in covers every
reader, including future ones. *Alternative:* guard in `listRecords` and
`listDrafts` — rejected: two copies drift, and `resolveRecord`'s fallback scan
would need a third. `readRecord` stays unguarded on purpose: it re-reads a path
that already parsed.

**D6. Report, do not repair or skip.** A non-regular path fails the way any
format error does: `list` and `show` exit non-zero naming the path, `validate`
reports it as an issue and keeps checking other records, `status` and
`instructions` surface it in their validation line. Skipping silently was
rejected: a record that exists but is not read is the drift this tool exists to
prevent.

## Risks / Trade-offs

- A draft that used an unterminated marker as scratch space now fails
  validation with `must contain written content`. That is the intended
  reading of the rule and is called out in the changeset and the docs.
- A record stored as a symbolic link to a regular file keeps working; if a
  future decision refuses links outright, that is a separate record.
