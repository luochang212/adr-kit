# Releasing adr-kit

The repository-local `npm-release` skill is project-independent: it carries
the generic npm release workflow and defers to the repository's own docs for
everything specific to this package. This page is that override. Read it
together with the skill; when the two disagree, this page wins for adr-kit.

## Package shape

`adr-kit` is a single public package and the repository root is its publish
target. There is no workspace, so the root `package.json` is the package. The
package is the CLI; the only bin name is `adrkit`, a thin loader for
`dist/cli.js` — a broken build path is invisible until install.

`site/` is an Astro homepage deployed by GitHub Pages and never part of the
tarball. `archived/` and `.changeset/` are excluded by the `files` whitelist.
`skills/` is normally agent instructions consumed from git, except for
workflow resources read at runtime by `adrkit init/update` — today the
visualize example — which must be listed in `files` (`test/integrations.test.ts`
asserts each declared resource is listed). npm also auto-includes
`skills/README.md` and `README.zh.md` even though `files` does not name them.

Expected tarball contents (treat `npm pack --dry-run` output as the truth; the
package grows over time):

```text
LICENSE
README.md
README.zh.md
bin/adrkit.js
dist/**            # compiled JS, .d.ts, and .js.map
package.json
skills/adrkit-visualize/examples/decision-atlas.html
```

If `src/`, `test/`, `site/`, `archived/`, `.changeset/`, a raw `.ts` source,
or an undeclared `skills/` asset appears, fix the `files` whitelist before
publishing.

## Registry override

This machine's user npmrc points at `https://registry.npmmirror.com`, a
read-only mirror that rejects publishes. Every `npm view` and every publish
command must target `https://registry.npmjs.org/` explicitly — via
`--registry` for `npm view`/`npm publish`, or
`npm_config_registry=https://registry.npmjs.org/` for `changeset publish`,
which has no registry flag.

## Version mechanics

Changesets is the source of truth for the version and the changelog.
`.changeset/config.json` sets `access: public`, `baseBranch: main`, and no
fixed or linked groups. `package.json` is the single source of the version:
`src/version.ts` reads it at runtime, so `adrkit --version` cannot drift.
Only `package-lock.json` needs to stay in step:

```bash
node -e "const l=require('./package-lock.json');console.log(l.version,l.packages[''].version)"
# if it lags: npm install --package-lock-only --ignore-scripts
```

`npm run release` is `changeset publish`. It publishes any package whose
local version is absent from the registry, runs `prepublishOnly` (which
rebuilds `dist/`), creates a local `v<version>` tag in the bare root form
(`v0.8.1`, matching existing tags), and does not push the tag.

## adr-kit-specific gates

Beyond the skill's generic checks, run:

```bash
node bin/adrkit.js validate --all   # after build: the bin entry loads dist/
```

`validate --all` is the last step of CI's test job, so a local pass of the
other four checks does not predict a green run. Run it after
`changeset version`, not only before: the bump deletes the consumed
changesets, which is exactly when a record that scopes one starts failing.

**No record may scope a changeset file.** `changeset version` deletes the
changesets it consumes, and `adrkit validate --all` then fails on the release
commit because the record's `paths:` entry matches nothing. 0.24.0
(2026-10-22) hit this: ADR 30 listed `.changeset/remove-archive-seal.md`, the
four local checks passed, and CI went red on `chore(release): v0.24.0`.
Before bumping, run:

```bash
grep -rn '\.changeset/' adr/ --include='*.md' | grep -v '^adr/notes.md'
# must print nothing
```

If it finds one, drop that path from the record first: a release-time file is
not a realization fact of the decision.

**Watch CI by workflow and SHA.** The gating workflows are `ci` and `site`;
`site` also runs on a `package.json` change, so `gh run list --limit 1` can
report green while `ci` fails:

```bash
git push origin main
sha="$(git rev-parse HEAD)"
for wf in ci site; do
  id="$(gh run list --workflow "$wf" --limit 5 --json databaseId,headSha \
    --jq ".[] | select(.headSha==\"$sha\") | .databaseId" | head -1)"
  [ -n "$id" ] && gh run watch "$id" --exit-status
done
```

If the release commit's run fails, fix forward in a new commit; never amend
or force-push a pushed release commit. `changeset publish` tags `HEAD` at
publish time, so the `v<version>` tag may land on the fix commit — that is
fine (0.24.0 is tagged on its scope fix). 0.18.0 shipped a Windows-only test
failure because the feature commits had never been pushed before the release;
code CI has not seen does not publish.

## Publishing and release page

The account requires 2FA with the browser web flow (see the skill's non-TTY
authentication section for the `expect` wrapper and the auth-URL handling).
The GitHub repository is `luochang212/adr-kit`. After the registry confirms
the version, create the GitHub Release from the same tag:

```bash
gh release create vX.Y.Z --verify-tag --latest --title "vX.Y.Z" \
  --notes-file /tmp/release-notes.md
```

Author the notes from the `CHANGELOG.md` section for that version: a short
Highlights list and an explicit Breaking change block when one exists,
ending with a link to `CHANGELOG.md`. `gh release view` has no `isLatest`
field; the Latest marker is the second column of `gh release list --limit 2`.
Keep npm account details, auth URLs, and auth IDs out of the notes.
