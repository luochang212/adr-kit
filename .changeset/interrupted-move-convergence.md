"adr-kit": minor
---

Make every lifecycle move convergent and harden the checks a repository
review surfaced.

- An interrupted `implement`, `reject`, `archive`, or `supersede` (process
  death between staging the target and removing the source) no longer strands
  the repository or silently duplicates a decision: re-running the command
  recognizes the copy it staged — the clock fields are allowed to differ, so a
  re-run across midnight still converges — finishes the move, and refuses on
  bytes no run of that command wrote. The decision number's write lock now
  spans staging and source removal, so a concurrent move of the same decision
  is refused at arbitration instead of racing the rollback; the retirement
  commands resolve through their own half-staged state instead of reporting it
  as unresolvable ambiguity.
- The pre-commit hook counts citation targets from the Git index, the same
  world the citing text comes from: a record the worktree lost but the index
  carries is no longer a missing decision, so staging a record plus a citing
  file and then cleaning the worktree no longer false-blocks the commit. When
  Git state cannot be read, the hook still fails open but now says so instead
  of passing silently.
- Validation enforces three rules the command layer already assumed: a
  supersession chain points at later decisions (greater numbers), a `paths`
  scope is spelled exactly as the repository spells it (matching is
  case-sensitive, so a wrong-case scope that only a case-insensitive
  filesystem would bless now fails everywhere), and `adrkit validate <name>`
  reports another record sharing its number, like a full validate.
- The decision-map Mermaid output percent-encodes the record link, so a file
  name with characters Mermaid treats specially cannot break the click line.
- Error copy names each command's actual positional (`note requires a line of
  text`, `hook requires a mode`, `completion requires a shell name`), refusal
  messages point at `adrkit list`, and the docs sync with all of it —
  including the upgrade guide's mislabeled Node-floor release note and the
  hook's undocumented hard fail on deleting archived records.
