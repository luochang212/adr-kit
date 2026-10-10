# Verification

- Before the fix, the configuration tests exposed silent acceptance and missing instructions diagnostics. Both source-removal fault-injection tests reached a real seal write and failed because the errors contained only the underlying deletion failure.
- After the fix, `npm test` passed 382 tests with one existing skip; `npm run typecheck` and `npm run build` passed.
- The documented invalid YAML example was tested against the built CLI in a temporary repository: validation exited 1 naming `rules.proposal[1]`; quoting `max: 500` made it exit 0.
- Separate built-CLI experiments injected `EACCES` only for the implemented source path, through `fs.rmSync` and `syncBuiltinESMExports`. Both `archive` and `supersede` exited 1 with sealing-completed/removal-failed diagnostics; removing the confirmed duplicate source restored validation. Temporary roots were resolved to real paths so macOS directory aliases did not bypass injection. All temporary repositories were deleted.
- Regression tests additionally verify unchanged source and replacement bytes, a matching archive seal, unchanged archived bytes and manifest after recovery, and the existing failed-seal rollback behavior.
- Configuration regression tests cover known field shapes, null, bad list indexes, YAML quoting, escaped control characters, optional fields, extension data, tolerant reads, pending proposals, and comment preservation.
- ADR 19's sealing and append-only history guarantees remain intact. These local fixes introduce no new architectural choice; no ADR was created.
- OpenSpec strict change validation, `adrkit validate --all --base HEAD`, the upstream grilling check, and `git diff --check` all passed. Both delta specs were checked against the implementation and regression evidence.
