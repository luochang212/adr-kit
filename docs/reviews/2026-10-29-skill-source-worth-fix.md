# Skill source duplication: worth fixing?

Assessment date: 2026-10-29. No production implementation was changed for this
assessment. Relevant decisions: ADR 1 (first-party workflow distribution),
ADR 24 (AGENTS.md ownership and integration targets), and ADR 35 (standing-orders
generation marker).

## Verdict

Worth a small build-time improvement, with low urgency. The current arrangement
has protected duplication, not demonstrated broken distribution. Retain the
existing TypeScript workflow definitions as the editing source and generate the
checked-in Markdown skills after compilation. This removes the manual mirror
without introducing a runtime resource loader or changing installed behavior.
It is a bounded change to authoring/build plumbing, not a CLI architecture
rewrite. This direction remains a recommendation, not an approved implementation.

## Verified facts

- There are 12 workflows. Their Markdown files total 36,681 UTF-8 bytes in the
  assessed tree. Every file is byte-identical to its TypeScript representation,
  including name and description. There is no current mirror drift.
- Both `skills/<name>/SKILL.md` and `WORKFLOWS` in
  `src/core/tool-integrations.ts` are maintained as sources today. Their equality
  and directory inventory are machine-checked by `test/integrations.test.ts`.
- `.agents/` and `.claude/` files are generated installation outputs; they are
  not additional authoring sources. Commands adapt resource links relative to
  their installed location, so these files are not all redundant byte copies.
- `npm pack --dry-run --json --ignore-scripts` currently includes zero
  `SKILL.md` files. Runtime workflow text is embedded in compiled JavaScript;
  the visualization HTML is shipped separately as a resource. Replacing the
  runtime definitions with Markdown reads would require package changes.
- The init body interpolates `standingOrdersSection()`. Its marker is derived
  from the canonical TypeScript standing-orders body. Moving authority to
  Markdown must explicitly resolve this dependency instead of retaining two
  authoritative standing-orders bodies by accident.

## Direct production-path experiment

All mutations were made in a temporary copy of the repository's source, tests,
skills, package metadata and TypeScript configuration. The copy used the already
installed dependencies. The actual integration equality test and actual
`writeToolIntegrations` function were exercised; no replacement installer was
used.

1. Run the existing `every template mirrors its skill file exactly` test:
   exit 0.
2. Append a probe to only the copied `adrkit-note/SKILL.md`: the same test
   exits 1. Restore it.
3. Add a probe to only the copied TypeScript note body: the same test exits 1.
4. Build that copy. Import its compiled `WORKFLOWS` and write each Markdown file
   using the exact serialization already asserted by the existing test. Only
   the note Markdown changes; the equality test returns exit 0.
5. Call the compiled production installer for both agents and claude targets.
   Both installed note skills contain the authoritative edit.

This reproduces manual synchronization cost, demonstrates the guard against
drift, and establishes feasibility of a small generator. It does not establish
that a completed build integration, fresh-clone pipeline, or all packed-package
scenarios pass; those remain implementation acceptance work.

Local probe script: `/tmp/adrkit-skill-maintenance-probe.mjs`. Raw results and
test logs were saved under
`/var/folders/62/qdg11mv92kz55lmbd6j6jsdm0000gn/T/adrkit-skill-maintenance-OBJPSQ/`.
These paths are temporary; the steps above describe the independently repeatable
production-path checks.

## Benefit and cost

| Dimension | Assessment |
|---|---|
| Trigger frequency | Every change to workflow text or description currently needs mirrored edits; recent repository history repeatedly changes integration text. No numerical drift rate is claimed. |
| Benefit | One authored change; fewer quoting/copy mistakes and failed-sync repair cycles. The compiler still provides the current standing-orders interpolation. |
| Impact | Developer and coding-agent maintenance. No demonstrated improvement to an adopting agent's ADR recall, context consumption, or answer quality. |
| Implementation cost | A small exporter after compilation, build wiring, contributor instructions, and tests of generation and the packed artifact. No new dependency or user command is required. |
| Ongoing cost | One build step to maintain. TypeScript string escaping remains; generated Markdown diffs still exist for GitHub distribution. Editing a generated file alone must produce a clear failure. |
| If left unchanged | Existing equality tests continue to catch drift when run. Maintainers keep paying the mirror-edit cost; there is no evidence of inevitable silent corruption. |

Runtime loading from canonical Markdown is a valid alternative and offers nicer
native text editing. In this repository it also requires changing the package
file inventory, loading/parsing metadata, and settling the init/hash source
dependency. Those costs are not justified merely to remove manual duplication
when the existing definitions can already generate all files exactly. Do not
add a bidirectional synchronizer, generic template framework, or another skill
registry for this purpose.

## What a 90-point implementation must demonstrate

Here “90-point” names concrete acceptance criteria, not an empirical quality
score or a claim that the prototype is already production-ready:

1. Edit workflow text and description in one documented source only. An ordinary
   build updates the checked-in skill files; no manual sync ritual is needed.
2. Before any text change, generated Markdown matches all 12 existing files
   byte-for-byte. Repeated builds are deterministic and leave no new diffs.
   The existing equality guard remains useful for detecting edited/stale outputs.
3. A fresh checkout with dependencies installed can typecheck, test, and build
   in the CI order. Export does not depend on a previous generated artifact
   or reach outside the package. A new workflow has a clear, tested addition path.
4. Install an actual npm tarball outside the source tree. Exercise init and
   update for all workflows, both integration targets, and a workflow subset;
   verify descriptions, order, command links, resource copying, repair
   preservation, and repeated-update behavior. Installed consumers do not run
   the repository exporter or require dev dependencies.
5. Standing-orders body and generation marker retain ADR 35's meaning; the
   current output stays unchanged. Init/update still never rewrite AGENTS.md;
   upstream grilling pin checks and visualization resources remain intact.

Do not extend this work into rewriting skill content, reorganizing workflows,
changing upstream synchronization, or reducing the number of installed copies.
The achievable gain is narrower: remove a recurring authoring obligation while
preserving the current distribution contract.

## Implementation follow-up

The user approved implementation. Workflow authoring remains in the existing
TypeScript definitions. `npm run build` compiles and then runs the small
`tools/build-workflow-skills.mjs` exporter. Both export and CLI installation use
`renderWorkflowSkill`; unchanged files are not rewritten. Supporting resources
and runtime resource loading are unchanged. Obsolete workflow directories are
removed deliberately by contributors rather than deleted by a broad build-time
cleanup. `skills/README.md`, repository conventions, and both README development
sections identify the editing source and ordinary build command.

The permanent `test/skill-build.test.ts` exercises production paths in temporary
directories: typecheck and build with neither dist nor generated skill Markdown;
generation of all 12 files; idempotence from another working
directory; tarball creation and offline installation outside the source tree;
all skills and descriptions under both targets; command resource links; repair
preservation; update regeneration and repeated-update behavior; AGENTS.md byte
preservation; and subset selection. It also changes one canonical body and adds
a workflow, then proves a build repairs the edited output and generates the new
skill. No developer dependencies or exporter run in the installed consumer.

Local validation: 759 tests passed, one skipped, across 38 files; typecheck,
build, record validation and whitespace checks passed. Hash comparison confirmed
all 12 skill Markdown files retain their pre-change content. ADR 1's realization
facts and scopes now describe the generated mirror; ADR 24/35's ownership and
marker behavior remain unchanged.

The upstream check passed its local vendored-file hash phase but could not
verify the live GitHub directory: the API returned HTTP 403 and the command
exited 2. No vendored file or upstream pin was changed. Cross-platform CI has not
been executed in this local macOS session.

## Test and documentation closeout

The two former mirror checks remain as fast committed-output checks, renamed to
describe their current purpose: exported content/format and directory inventory.
They catch missing regeneration, edits to generated files, and obsolete workflow
directories. Their expected serialization is independent of the shared renderer,
so they also pin the existing skill format. The new build/package test no longer
duplicates the content comparison; it covers fresh regeneration, idempotence and
installed-package behavior. CI still tests committed files before building, with
that ordering documented beside the steps.

Contributor instructions and active source comments use one authoring source.
Supporting resources and the reviewed upstream pin retain their separate roles.
Historical assessment/probe descriptions above are retained as history. Runtime
and local documentation are verified; remote CI and publishing remain pending,
the upstream API verification is still blocked by the previously observed 403,
and external projects, global installations and agent memory are out of scope.
The closeout reran the integration and build/package tests: 58 passed, one
skipped. Whitespace checks passed; no runtime behavior changed in this closeout.

## Review before committing the accumulated changes

The user requested review of all uncommitted work, with commits authorized only
after correctness review. Separate standards and requirements reviews found no
actionable findings. The reviewed scope includes description/tag migration,
onboarding, show's optional-appendix boundary, and generated skill maintenance.
The archived-body comparison was repeated against HEAD: all six bodies are
unchanged. The illustration payload's 26 records have descriptions and no tags.

Fresh verification: 759 unit tests passed, one skipped; 87 browser tests passed;
typecheck, root build, website build, all-record validation, and whitespace
checks passed. The upstream online check was retried and again exited 2 on
GitHub HTTP 403; local vendored hashes match the manifest. This remains an
external verification limitation, not a passing online check. No upstream
content, package version, global installation or external project was changed.
