# Proposal

## Why

ADR Kit already has path-scoped retrieval and a low-cost note buffer, but reviewers must assemble changed paths themselves and bounded directory searches silently lose files. Its skills also need concrete evidence discipline so exploration, capture, and review reuse real observations without inventing rationales.

## What Changes

- Extend `relevant` with mutually exclusive `--base <git-ref>` and `--staged` inputs, preserving deleted paths and both rename endpoints.
- Expose incomplete directory searches and active records without scopes; incomplete searches return matches plus diagnostics and exit non-zero. Malformed active records and Git failures remain explicit errors.
- Read only active lifecycle folders during scope retrieval; retain existing grouping, glob dialect, and full-read obligations.
- Strengthen installed grill/note/propose/record/review workflows with source anchors, explicit unknowns, and plan-versus-diff context. Keep evidence in ordinary Markdown.
- Update bilingual references, completion, mirrored skills, dogfooded integration files, and meaningful tests.

## Capabilities

### New Capabilities

- `scope-retrieval`: path and Git change inputs, lifecycle-aware matches, input completeness, and coverage limitations.

### Modified Capabilities

- `decision-governance`: installed workflows ground observations and rationale in evidence, and retrieve planned or actual change context without treating it as exhaustive authority.

## Impact

Core Git/retrieval/repository readers, CLI dispatch/options/completion, integration templates and skills, bilingual CLI/workflow docs, README, tests, and an agent-decided ADR extending ADR 22. No new runtime dependency, record field, output format, service, hook, or rule executor. The earlier research change remains untouched.
