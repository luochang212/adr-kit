# AGENTS.md

OpenADR is a command-line tool for Architecture Decision Records. This file
contains standing orders for coding agents working in this repository.

## Commands

```sh
npm install
npm run typecheck
npm test
npm run build
```

Run the smallest check that covers the changed surface. `npm test` is the
fast unit gate; CI also runs `npm run build` and `npm run typecheck`.

## Conventions

- The runtime CLI lives in `src/cli.ts` and the command implementations in
  `src/commands/`. Core logic (parsing, validation, repository handling)
  lives in `src/core/` and must stay independent of `console` and
  `process.argv` so it remains testable.
- Record files are plain Markdown. The parser and validator are the format
  contract; do not introduce front matter or a second format without
  changing `src/core/adr.ts`, `src/core/validate.ts`, the templates, and
  the README in the same change.
- `parseArgs` from `node:util` is the CLI parser. Do not add a CLI
  dependency for argument parsing.
- `yaml` is the only runtime dependency. Keep it that way unless a change
  is irreducibly dependency-shaped.
- Every behavior change gets a test in `test/`. Command tests create real
  repositories in a temp directory and assert on files and command output.

## Record format is the product

The header order (`# ADR:`, `Status:`, blank line) and the per-status
section skeletons are machine-checked. When you change a template or a
validation rule, update:

- `src/core/templates.ts`
- `src/core/validate.ts`
- `README.md`
- at least one test in `test/commands.test.ts`

## Validation failures are success signals

`openadr validate` is supposed to fail on fresh drafts until humans or
agents fill in the required sections. Tests must prove both sides: valid
records pass, and draft records fail for the exact missing requirement.
