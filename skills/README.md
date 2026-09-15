# ADR Kit skills

Agent skills for the ADR Kit CLI. Each skill is a short, self-contained
workflow that drives the `adrkit` binary.

Install into any skills-compatible agent by copying the `adrkit-*/`
directories, or read them as the canonical agent instructions for the
matching command.

The init skill also guides the agent to add the task-start reading rule to
project instructions. See [Read decisions before coding](../docs/workflow.md#read-decisions-before-coding).
Existing projects should run `adrkit update` and add that rule to their agent
instruction file; installing workflow skills alone does not establish a
reading step for ordinary coding tasks.
