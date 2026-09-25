---
status: implemented
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
tags: [visualization, decision-graph, delivery]
---

# ADR: 14 Resolve decision-map record links against the output path

## Problem

Each node of the decision map links to its record with a repository-relative
path (`adr/implemented/8-….md`; `adr/decisions/…` before ADR 18), which the
browser resolves from the HTML file's own directory. Nothing had settled where
that file goes: `adrkit graph --html`
emitted the map to stdout, the visualize skill told the agent to write it to the
user's location or a temporary directory, and the two disagreed. Delivered to a
temporary directory, the map drew correctly while every card led to a
file-not-found page. The tool had produced links whose correctness depended on a
placement decision it neither made nor stated — a delivery contract with one
rule missing.

## Decision

- `adrkit graph` gains `--out <path>`: the command writes the artifact to that
  path and resolves the map's record links against the file's own directory, so
  the links are right for wherever it lands. Inside the repository they stay
  repository-relative, keeping the map portable, committable, and movable with
  the records; outside it they become absolute `file://` URLs, which is the only
  form that still resolves there.
- Redirecting stdout without `--out` keeps record-relative links, and the
  reference says such a map belongs inside the repository.
- The visualize skill delivers the map with `--out`, so a temporary directory is
  an ordinary choice rather than a way to break the links. The tree keeps
  redirection: it carries no record links.
- `--out` writes any `graph` format, not just HTML, and refuses a path whose
  directory does not exist instead of creating it.

## Alternatives considered

- **Always emit absolute `file://` links**: rejected. It repairs the temporary
  case by making every map machine-local, so a map committed to a repository or
  handed to a colleague would point at the author's disk, and the record paths
  every other format reports would stop matching the HTML.
- **Keep the links relative and require the map to live in the repository**: this
  was the first repair, and the maintainer rejected the constraint that a
  generated artifact has to be written into the repository to be usable.
- **An `--absolute-links` flag**: rejected as the contract's home. A caller that
  forgets it reproduces the bug, and a caller that passes it for an in-repo map
  silently loses the portable form; the placement of the file already determines
  the right answer, so the command should read it rather than be told.
- **Post-process the HTML after writing**: rejected. Rewriting links outside the
  command hands the contract back to the caller, which is exactly where it
  failed.
- **A `<base href>` element or a script that repairs links when the page loads**:
  rejected. The page cannot know the repository root without embedding an
  absolute path, which is the first alternative again.
- **A new command or a second output file**: rejected in line with ADR 9 — a
  flag is a smaller surface than a command, and one artifact stays one artifact.

## Consequences

- The map's links are correct by construction for any destination, so the class
  of bug where a correct picture has dead links is closed rather than documented.
  A map written into the repository remains portable; one written outside is
  machine-local, which its absolute links make visible.
- New CLI surface: `--out` on `adrkit graph`, with shell completion, the
  bilingual CLI reference, and a `decision-graph` spec requirement. The change is
  a minor bump.
- The skill's delivery step names `--out`, so an agent cannot choose the wrong
  link form by choosing a location.
- The maintainer reported the dead links, required temporary delivery to keep
  working, and asked for the delivery contract to be settled in the tool; the
  mechanism — write with `--out`, relative inside the repository, absolute
  outside — is the agent's proposal, recorded here so the provenance is plain.
