---
"adr-kit": patch
---

- Fix the broken banner image on the npm package page: include the
  `assets/` directory in the published package and load
  `assets/social-preview.png` from unpkg, which serves files from the
  tarball. npm does not serve package files, so relative README references
  resolve to dead paths there.
- Point the README links to the GitHub blob URLs for the docs, skills, and
  license, which are not part of the published package.
- Replace em-dash separators in user-facing output (`adrkit instructions`
  readiness flags, `adrkit list` empty state), help text, docs, comments,
  and test fixtures with `-` or `:`.
