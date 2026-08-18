---
"adr-kit": patch
---

- Include the `assets/` directory in the published package so the README
  banner image (`assets/social-preview.png`) renders on the npm package
  page instead of showing a broken image.
- Replace em-dash separators in user-facing output (`adrkit instructions`
  readiness flags, `adrkit list` empty state), help text, docs, comments,
  and test fixtures with `-` or `:`.
