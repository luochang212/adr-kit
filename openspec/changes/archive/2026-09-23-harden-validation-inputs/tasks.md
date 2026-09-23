## 1. Content definition and bound

- [x] 1.1 Replace the comment-stripping regex in `hasMeaningfulBody` (`src/core/adr.ts`) with a single linear scan: skip from each `<!--` to the next `-->`, treat an unterminated `<!--` as swallowing the rest of the section, and keep the predicate as the only reader of that rule; verify 468 KB of unterminated markers strips in milliseconds rather than ~11 s
- [x] 1.2 Add the `test/validate.test.ts` cases for the content rule: markers alone are not content, an unterminated comment swallows following prose, text outside a comment is content, and the existing closed-comment case still fails; verify the durable-decision and draft paths both report `must contain written content`
- [x] 1.3 Add the bounded-work regression to `test/validate.test.ts`: a decision whose `## Problem` body is 500 KB of `<!--` validates with the content issue reported and completes within a couple of seconds; verify it takes ~13 s before the fix and passes after

## 2. Read path

- [x] 2.1 Add the regular-file guard to `parseAdrFile` before `readFileSync`: `statSync` the path, accept `isFile()`, and otherwise throw an `AdrFormatError` naming the kind (directory, FIFO, socket, character device, block device) with the errno detail preserved for a missing or dangling path; verify `adrkit list` and `adrkit validate` report a directory named `1-x.md` and a FIFO named `1-x.md` without reading either
- [x] 2.2 Add the `test/regressions.test.ts` cases: a directory record path reports the kind; a FIFO (POSIX only) reports the kind and returns instead of blocking; a symlink to `/dev/zero` is refused; a symlink to a regular file is still read and validated; verify each against the built CLI
- [x] 2.3 Verify the blast radius claimed in the proposal: with a FIFO present, `list`, `show`, `status`, `validate`, `instructions`, `decide`, `graph`, and `tree` each return non-zero (or a validation issue line) promptly instead of blocking past the watchdog

## 3. Docs

- [x] 3.1 Extend the `## Alternatives considered` sentence in `docs/record-format.md` to state that an unterminated comment is not content and swallows the rest of the section; verify the wording matches scenarios 1 and 3
- [x] 3.2 Mirror the same wording in `docs/zh/record-format.md`; verify the two languages agree

## 4. Red-to-green evidence

- [x] 4.1 Run the new tests against the pre-fix tree (the fix in 1.1 and 2.1 was applied after the red run) and record which fail there: the content-rule cases fail on the assertion (4 of 6, the two pins for existing behavior pass), the bounded-work case takes ~10 s and fails its bound, the directory case fails on the message, and the FIFO case blocks past 20 s until killed (red = hang, which is why it ran under a watchdog); the symlink-to-device case was not run red on purpose — the old code reads `/dev/zero` without end, so its red evidence is the audit measurement (still running at 6 s, ~420 MB RSS and climbing)
- [x] 4.2 Run the same tests on the fix and record them passing, one per behavior (the `accept`-refusal case was added after the red run and verified green with the rest; its red evidence is the audit repro against the unfixed CLI, where `instructions` reported the marker-only draft ready and `accept` promoted it)

## 5. Governance

- [x] 5.1 Add a changeset describing the content rule, the bound, and the regular-file requirement
- [x] 5.2 Record the ADR with `adrkit decide` (the record format's `written content` definition and the readable-path rule), then run `adrkit validate`
- [x] 5.3 Run `npm test`, `npm run typecheck`, and `npm run build`; verify all pass
- [x] 5.4 Archive this change with `openspec archive` and verify the deltas land in `openspec/specs/validation-integrity/spec.md` and the reference docs stay in sync
