# Recording judgment evaluation

These cases evaluate an agent's choices, not whether a skill contains particular
words. They are a manual evaluation protocol, not a measured quality claim.
Integration tests cover distribution of the instructions only.

Run each case in a fresh disposable repository with the generated skills and
standing orders installed, using the agent/model configuration being evaluated.
Give the agent the task and inspect its actions, record content, and final reply.
Do not supply the expected behavior to the agent. For cases with existing records,
seed a valid record with the stated constraint and no additional recording policy.
Use the ordinary coding workflow unless grilling is explicitly requested. Preserve
prompts, model/version, outputs, and diffs with any reported results.

| Case | Task and initial context | Expected behavior |
| --- | --- | --- |
| Routine upgrade | Upgrade adr-kit to a newer version; no changed project constraint | Upgrade without a new ADR or deferred note about the event |
| Visual iteration | Adjust a button's spacing and shadow to match a supplied visual | Edit styles without a new ADR or routine ADR synchronization |
| Hidden offline constraint | User states only in conversation that production has no public-network access; select how to load assets | Preserve the constraint and its reason; do not freeze asset versions or inventories |
| Visible constraint | The same offline requirement and its reason already have an authoritative document and enforcement tests | Reuse that owner; no duplicate ADR merely because the topic is important |
| Local severe consequence | User explains that one importer's source token is single-use, so retrying after a partial read loses the only copy; this reason exists nowhere else | Preserve the otherwise hidden reason and retry boundary despite narrow scope |
| Long-lived but volatile | A landing page will last years; select today's exact hero padding | Do not treat page longevity as evidence that padding merits an ADR |
| Existing upgrade precedent | A valid existing ADR merely documents a previous adr-kit upgrade; perform another ordinary upgrade | Do not extend the precedent into a new upgrade ADR; identify burden if encountered and propose a disposition without silently retiring the old record |
| Freedom inside a constraint | Existing ADR requires shared theme behavior and accessible controls but makes no spacing claim; adjust spacing | Keep the constraint, with no ADR edit for spacing alone |
| False implementation claim | Existing ADR names a file that this task moves | Correct the claimed path and keep references valid; do not use selection judgment to excuse false claims |
| Explicit user preservation | User expressly asks to preserve a specific otherwise routine choice | Honor the request without inventing rationale or requiring all future similar edits to be recorded |
| Empty-value grill | User explicitly requests grilling only to settle temporary visual details | Discuss and summarize; create no ADR or note merely because grilling occurred |
| Mixed grill | A grill settles the hidden offline constraint plus temporary visual details | Preserve the full tree with the qualifying decision; local details remain deliberation context, not independent maintenance obligations |
| Discardable note | An existing note says only that a routine upgrade occurred; asked to shape useful notes | Do not promote automatically; discard a valueless note when allowed by the note workflow |
| Hollow proposal | An existing proposal records only a routine version bump; asked to prepare promotion | Explain lack of independent value and suggest disposition; do not promote automatically or silently delete/reject it |

Assess selection, preserved information, maintenance burden, and respect for user
intent separately. Treat missed important hidden context, invented rationale,
unauthorized retirement, or propagation of routine-record obligations as failures.
A no-record result must not hide unperformed work or ignored constraints. Review
written records for an actual reason and stable boundary rather than impressive
language. Repeat across models and task variants before reporting a success rate;
passing these cases once cannot establish that arbitrary ADRs reach “90 points.”
