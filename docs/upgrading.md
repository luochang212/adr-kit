# Upgrading

ADR Kit is pre-stable and breaks on purpose: a release may change the record
format or the command surface, and nothing promises forward compatibility. The
[README](../README.md#stability) states the stance; this guide carries the
per-release notes. Every change, breaking or not, is listed in the
[changelog](../CHANGELOG.md).

## The supported path

1. `npm install -g adr-kit` — install the latest release.
2. `adrkit update` — refresh the installed agent integrations.
3. `adrkit validate --all` — run in each repository; validation errors name
   what changed.

The standing orders tell your agent to upgrade the package, migrate active
records where the change is mechanical, and report a record it cannot carry
over instead of forcing a rewrite. A migration is never assumed to exist.
Archived records change only through a deliberate, explained commit.

## Upgrade notes

Newest first. Each note names what changed and what to do.

### After 0.30.0: show omits deliberation

`adrkit show <name>` now omits the optional `## Deliberation` section while retaining the rest of the record. Read the file at the printed source path for the original deliberation. Scripts that need the complete source must read that file instead of capturing `show`. Records and atlas rendering need no migration.

### After 0.30.0: descriptions replace tags

Remove `tags` from every record and write a non-empty single-line `description` explaining the subject and circumstances in which it should be read. Titles name the choice; descriptions help select records. Fresh templates leave the field blank and fail validation until it is authored. Existing labels cannot reliably supply a description, so an upgrade needs author judgment; report records whose applicability cannot be established. This repository deliberately migrates archived front matter in the same change while preserving archived bodies; use an explained migration commit for your archives too.

Remove `--tag` from map commands. The option has no replacement filter or alias. Current decisions share one accent and archived decisions retain gray dashed styling and explicit lifecycle text. Relationships, dates, sources and full archived bodies remain available. Refresh integrations with `adrkit update`, then run `adrkit validate --all`.

### After 0.30.0: path scope correction

`paths` entries may no longer end with `/`. A scope such as `src/` validated
but could never match a file, so validation now rejects it; write `src/**` to
scope a directory. The
atlas title, Chinese map labels, completion, and config output fixes need no
migration.

### After 0.29.0

Validation tightened: `Consequences` must contain written content in
implemented and archived decisions, and proposals must also fill
`Acceptance criteria` and `Risks`. Empty headings, HTML comments, and fenced
examples do not satisfy these requirements. Run `adrkit validate --all` and
have the author supply the missing substance; this is not a mechanical
migration, and placeholder prose is not a remedy. Explain any archived edits
in their commit. Rejecting a proposal still requires only its problem,
proposal, alternatives, and a reason; an abandoned implementation plan need
not be completed.

### Standing-orders marker

The standing-orders section in `AGENTS.md` is yours: its optional
`<!-- adrkit: standing-orders <id> -->` generation marker declares which
template you reconciled it against, not identical text. Translation,
shortening, and local edits are allowed; keep project-specific obligations
outside the section. An old marker produces a note in `init`, `update`,
`list`, `instructions`, and `relevant`: compare with the current
`adrkit-init` template and reconcile the changes before updating the marker.
Unmarked sections stay quiet, including older installations; retain or add
the current marker after reconciliation to opt into future template-change
notes. A missing section still produces the separate init/update note.

### Visualization consolidated (ADR 33, ADR 36)

`adrkit atlas` is the one visualization command: `adrkit atlas` writes the
full atlas, `--map` selects the decision map, and `--record <N>` renders one
decision's deliberation tree. Trees default to HTML and support
`--format html`; `--diagram` is removed, `adrkit graph` and `adrkit tree`
are gone, extra positional arguments to `atlas` are rejected, and map exports
in any format must explicitly add `--map`.

### Package, command, and runtime

The npm package is `adr-kit` and the CLI is `adrkit` (there is no `adrkit`
package on npm). The CLI requires Node.js 22.22 or later; earlier Node.js
lines are no longer supported.

### CLI strictness (0.27.0)

Every command rejects extra positional arguments instead of ignoring them,
except that `record`, `propose`, and `note` join unquoted shell words into
one title or text. `validate` takes either a record name or `--all`, not
both.

### Archived manifest (0.23.0 and earlier)

An `adr/archived/MANIFEST.json` written by 0.23.0 or earlier is no longer
read; delete it.
