---
'adr-kit': patch
---

The package name becomes discoverable from the command name, so users who only know `adrkit` can find the package on npm.

- The package lists `adrkit` as a keyword, so `npm search adrkit` now returns `adr-kit`; previously that search returned only other projects' packages and none of ours.
- `adrkit --help` names the npm package in its header line.
- The standing-orders template (generation `b82e4add`, up from `449bd66b`) tells agents the npm package is `adr-kit` and the command it installs is `adrkit`, so install and upgrade with `npm install -g adr-kit`; existing AGENTS.md sections receive the template-change note on the next `adrkit` command and reconcile.
- The READMEs, the site homepage in both languages, and `docs/cli.md` state the package and command distinction next to the install instructions.
