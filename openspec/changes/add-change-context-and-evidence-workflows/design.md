# Design

## Context

See proposal.md - Why. ADRs 20/21/22 already own inventory reading, low-cost notes, and minimal scope matching. `relevantRecords` currently walks directories up to 2,000 candidates, silently catches read failures, and uses listRecords which parses archived files before filtering. Existing listRecords failures on malformed active records are useful and must remain. CLI and completion share COMMAND_OPTIONS; integration templates byte-mirror skills. No existing scope-retrieval capability exists; governance additions extend the existing specification.

## Goals / Non-Goals

Goals: compose existing surfaces around planned work, actual changes and real evidence. Non-goals: semantic ranking, JSON output, MCP, hooks, validators of prose truth, format changes or executable rules.

## Decisions

- Extend relevant rather than create a parallel context command. Options are exclusive input sources, not filters. Base means exact commit to current working tree plus non-ignored untracked; staged means index only, including unborn Git. Resolve a base to a commit hash safely before diff. Git uses execFileSync argument arrays, --no-ext-diff/--no-textconv and NUL-delimited name-only output with rename detection disabled, preserving both rename endpoints. Normalize Git-root paths to nearest ADR root; do not walk Git file inputs.
- Keep one matching core. Add input diagnostics and unscoped count to the result; command returns output plus complete, as validate already does. A bounded walk counts files, exposes truncation and unreadable paths, and keeps acquired matches; CLI exit 1 signals incomplete acquisition. Missing planned paths are valid. Git or active-corpus failures remain fatal. Inventory gaps are advisory because paths are optional.
- Let listRecords accept a folder subset, defaulting to its current complete inventory. relevant uses only active folders. No tolerant corpus parser or status inference is introduced.
- Skill enhancements keep evidence as inline Markdown links or code locations. Notes remain one line; a candidate and unknown reason are visibly tentative. Grill integrates existing constraints and sources into its design tree; review uses actual diff inputs and full reading. No fixed option count, automatic recorded decisions, new provenance fields or evidence store.
- Proposed ADR extends ADR 22 and links ADR 20; it does not supersede either. Evidence writing refines existing workflows under ADRs 1/3/19/21 without changing their architectural choices.

## Risks / Trade-offs

- [Partial output mistaken for success] → diagnostics plus CLI nonzero; unscoped records have a separate advisory count.
- [Git names/ref become command arguments or lose boundaries] → argument arrays, resolved commit, -z parsing, no shell; spaces/newlines/leading-dash fixtures.
- [Nested ADR repository includes sibling code] → filter against ADR-root boundaries; normalize roots including symlinked temp roots.
- [Evidence prompts become busywork] → optional anchors in notes, concise facts in existing sections, no mandatory schema.
- [Tests prove instructions only, not model obedience] → mirrored and installed-surface checks plus task scenarios; explicitly report the behavioral limit.

## Migration Plan

No format migration. Users refresh installed workflows with adrkit update. Existing explicit path invocations remain accepted; only previously silent incomplete acquisition changes exit status. CLI minor changeset. OpenSpec changes remain active until separately archived; an ADR stays proposed until implementation and checks are delivered.
