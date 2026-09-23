## Why

An audit on 2026-09-23, prompted by the OpenSpec v1.13.1 hardening release,
asked which of its input-hardening classes apply to this CLI. Four of the five
probes found nothing: config values never reach generated instructions
(integrations are static, test-enforced mirrors), the upgrade notice makes no
network call whose registry could be redirected (it compares a local
`installed-with` stamp), and `adrkit update` removes only its own `adrkit-*`
files (user files in `.claude/` survive a tool switch, verified). Reading a
record, however, turned out to be both winnable and wedgeable by crafted input.
Every number below was reproduced against the built CLI (`node bin/adrkit.js`)
at `6ec0049`.

- **Written content can be faked.** `hasMeaningfulBody` strips HTML comments
  with `/<!--[\s\S]*?-->/g`, which matches only a *closed* comment. A draft
  whose every required section holds a single unterminated `<!--` is reported
  `✓ validated - ready to accept`; `accept` promotes it, and the resulting
  durable record passes `adrkit validate` with no content in any section.
  Validation is this repository's real gate (ADR 2) and its failures are meant
  to be success signals, so a section that carries nothing but a marker
  passing as written is the gate lying.
- **The same expression is quadratic.** With no `-->` to close them, every
  `<!--` starts a fresh scan to the end of the body. 468 KB of markers took
  11,445 ms in the bare regex; through the CLI, `validate` took 13.0 s on
  468 KB, and 938 KB and 1.9 MB payloads hung `adrkit validate`,
  `adrkit status`, and `adrkit instructions` past 30 s (`list`, `show`, and
  `decide` do not run the predicate and stayed at 0.29 s). The file is
  ordinary committed Markdown — no special file needed — so a clone, a pull
  request, or a repository's CI inherit the hang.
- **A record path need not be a file.** `readFileSync` reads whatever the path
  resolves to. A FIFO in `adr/decisions/` blocks forever: `list`, `show`,
  `status`, `validate`, `instructions`, `decide`, `graph`, and `tree` all
  blocked past 8 s before being killed, while `propose`, `config`, `reject`,
  and `completion` were unaffected. A symlink to `/dev/zero` reads forever —
  still running after 6 s, RSS at 390 MB and climbing to 421 MB between
  samples, killed. FIFOs cannot travel through git (a clone never receives
  one), but symlinks can (mode 120000), so the symlink form is deliverable
  through a repository.

## What Changes

Content definition and bound:

- `hasMeaningfulBody` SHALL count only text outside HTML comments. An
  unterminated `<!--` swallows the rest of the section (CommonMark), so a body
  carrying comment markers but no text is not written content.
- The strip SHALL be a single linear scan rather than a backtracking regular
  expression, so a crafted body cannot make a read or validation quadratic.

Read path:

- Reading a record SHALL require the path to resolve to a regular file, and
  SHALL report the kind found — directory, FIFO, character device, socket —
  instead of reading it. A symbolic link to a regular file remains a readable
  record.

Docs and tests:

- `docs/record-format.md` and `docs/zh/record-format.md` state the comment
  rule and its unterminated case where they already document the comment
  strip.
- Regression tests pin each behavior: marker-only content is refused, the
  crafted payload validates promptly, and a non-regular record path is
  reported rather than read.

Out of scope on purpose:

- A size cap on records. A large committed regular file is a slow-but-bounded
  read, and an arbitrary limit would refuse legitimate records; git and review
  are the control there, not the parser.
- Refusing symbolic links outright. The danger is the resolved target's kind,
  not the link, and symlinked records that are regular files work today.
- Detecting a path that changes between the stat and the read.

## Capabilities

### New Capabilities

- `validation-integrity`: what counts as a section's written content, the
  bound on validation work for crafted input, and the requirement that a path
  read as a record resolve to a regular file.

### Modified Capabilities

- None. The existing specs keep their requirements; this adds the guarantee
  they all rest on.

## Impact

- Core: `src/core/adr.ts` — the comment strip (`hasMeaningfulBody`) and the
  read guard in `parseAdrFile`, the single chokepoint every reader goes
  through (`listRecords`, `listDrafts`, `resolveRecord`, `resolveDraft`).
- Docs: `docs/record-format.md`, `docs/zh/record-format.md`.
- Tests: `test/validate.test.ts` for the content definition and the bound,
  `test/regressions.test.ts` for non-regular record paths.
- Behavior: a validation that used to pass can now fail (a section carrying
  only comment markers), and a non-regular record path is refused with a
  message naming the kind instead of an errno string.
- Changeset: patch.
- ADR: the change defines what `validate` means by "written content" and which
  paths are readable as records, which constrains the format contract, so it
  is recorded in `adr/`.
