# Visualization discovery after a package upgrade

Scope: generic discovery and routing, not a repair for any particular adopter.
No adopter repository or agent transcript was available. Its actual command,
resolved executable, loaded instructions, and artifact remain unknown.

## Verified pre-change behavior

The current source and compiled CLI identify as 0.25.0. Temporary repositories
were exercised through the production init, update, atlas, and list functions;
the temporary repositories were removed afterward. No adopter files were changed.

- `init --tools none`, followed by bare `update`, leaves the visualization
  skill absent. `tools: []` is deliberate opt-out, not a failed update.
- `init --workflows init,propose,implement,validate`, followed by bare `update`,
  also leaves it absent. ADR 13 explicitly preserves chosen subsets.
- A default installation includes the skill. Deleting its `.agents/` directory
  and running bare `update` restores it. With a current `installed-with` stamp,
  `list` does not report the deleted integrations; its notice compares versions,
  not the installed files.
- Even with `tools: []`, `atlas` returns the full page containing
  `id="directory-search"` and `id="reader"`. `atlas --format html` returns
  the standalone map without those elements. Local skill installation is not
  required to render the full atlas.
- With `--out`, both views report only `wrote <absolute path>`; the receipt does
  not identify the selected artifact.
- `adrkit help` and the current visualize skill distinguish these modes.
  `graph` and `tree` are rejected with the full help, not retained as aliases.

The release package contains compiled commands and workflow templates. Merely
upgrading that package does not execute `updateCommand` for adopter repositories,
rewrite their AGENTS.md, or replace instructions already loaded by an agent.
These are separate surfaces and must not be described as one upgrade operation.

## Diagnosis boundary

An old agent habit can survive an executable upgrade. In particular, adapting
an old HTML-map command to `atlas --format html` successfully generates a map
on the current CLI. This is a verified possible path, not proof of what the
reported agent did. Other possibilities include a different executable on PATH,
a project-local pinned version, stale generated files, or instructions loaded
outside the repository. An absent `.agents/` directory does not by itself rule
out user-level skills or other instruction carriers.

## Generic recommendations, not adopted decisions

1. Improve the skill-independent CLI route: prominently give the exact full
   atlas command, and identify atlas versus map in output-file receipts.
   Keep intentional map exports available and do not infer intent from a filename.
2. Reconsider ADR 33's `--format html` trade-off: a format flag also switches
   the content from atlas to map, so an ordinary request for HTML selects the
   smaller product. An explicit map selector with a separate output format
   would remove this trap, but changes a settled CLI contract and needs its own
   proposal, tests, and breaking-change documentation before implementation.
3. If integration diagnostics are added, distinguish expected-but-missing files
   from deliberate opt-out/subsets. Do not silently install every skill or
   rewrite AGENTS.md. Version equality does not prove installation completeness.
4. Do not add an atlas advertisement to every record listing, restore removed
   aliases, or accumulate project-specific prompt workarounds. The existing
   default is correct; strengthen discoverability and observable results.

ADR 33 owns the current routing. ADR 13 owns explicit skill subsets. ADR 24
owns the single AGENTS.md carrier. These constraints remain active; this report
neither supersedes them nor claims an accepted replacement.

## Follow-through

The maintainer subsequently required explicit map selection. The working-tree
implementation and its tests now require `--map` for every map format;
`atlas --format html` retains the full atlas. The decision is recorded
in `adr/implemented/36-select-visualization-objects-explicitly-before-choosing-a-format.md`.
The measurements above describe the behavior before that change.

## Follow-up CLI consistency audit

Audited the local explicit-map implementation through production functions and
real CLI subprocesses. This section records remaining findings, not accepted
interface changes. No product code was modified during this audit.

- Atlas and map default to HTML; `--record 1` instead fails and demands a
  diagram or source-format flag. `--record 1 --format html` also fails although
  the same record's HTML tree works through `--diagram`. The error claiming a
  tree has only Mermaid or text describes the source-format branch, not the
  renderer's actual capabilities. Recommended: HTML as the default for each
  explicitly selected object, and one `--format` mechanism for all encodings;
  remove the separate diagram flag if this direction is adopted.
- `atlas 1` returns status 0 and the full atlas, silently ignoring the positional
  argument. `atlas --map unexpected` also returns status 0. The dispatcher
  collects remaining positionals but does not reject them in the atlas branch.
  Recommended: reject every positional argument for this command and point
  record queries to `--record`.
- All three file-output paths return the same `wrote <path>` receipt. This is
  an observability limitation, not an object-routing bug. Naming the selected
  object and format in the receipt would help users and agents check results.
- `--lang` is explicitly restricted to full atlases. `--tag` and
  `--formal-only` are explicitly restricted to maps; map and record selectors
  are mutually exclusive. Different supported format sets are capability
  boundaries, not a reason to force unimplemented formats onto every view.

A normalized target could retain the current selectors: no selector for the
full atlas, `--map` for the relationship map, and `--record <name>` for a
record's deliberation tree; each defaults to HTML and uses `--format` for
other supported encodings. This target is a recommendation pending direction.

The maintainer accepted the two remaining syntax fixes and the receipt update.
The local implementation now defaults record trees to HTML, supports explicit
HTML through `--format`, removes `--diagram`, rejects all atlas positionals,
and names the selected object and format in file receipts. These changes are recorded together in ADR 36; no second decision was created.

## Delivery

ADR 36 records the implemented CLI contract and partially amends ADR 33.
The observations above retain their pre-change context; the explicit-object
proposal was promoted alongside its implementation, with no compatibility alias.
