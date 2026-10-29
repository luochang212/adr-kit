# ADR Kit skills

Agent skills for the ADR Kit CLI. Each skill is a short, self-contained
workflow that drives the `adrkit` binary.

Install into any skills-compatible agent by copying the `adrkit-*/`
directories, or read them as the agent instructions for the matching command.

The init skill also guides the agent to add the task-start reading rule to
project instructions. See [Read decisions before coding](../docs/workflow.md#read-decisions-before-coding).
Existing projects should run `adrkit update` and add that rule to their agent
instruction file; installing workflow skills alone does not establish a
reading step for ordinary coding tasks.

## Editing workflow skills

Edit workflow text and descriptions in `src/core/tool-integrations.ts`, then
run `npm run build` and commit the generated `*/SKILL.md` files with the source
change. The build and CLI installer share the same renderer. Do not edit the
generated Markdown directly; the integration tests reject stale exports.

Add a workflow in `WORKFLOWS` and build to create its Markdown. When removing a
workflow, also remove its obsolete directory and review any supporting resources;
the build never deletes directories or hand-authored resources.

Supporting files, including `adrkit-visualize/examples/decision-atlas.html`,
remain hand-authored. The vendored grilling method and its upstream pin remain
subject to their existing manual review process.
