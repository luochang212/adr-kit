---
"adr-kit": patch
---

- Fix the broken banner image on the npm package page: point the README
  image and every link (docs, skills, license, language switcher) at
  public GitHub URLs (`raw.githubusercontent.com` for the image, blob URLs
  for links), which render on both GitHub and the npm page now that the
  repository is public. npm does not serve package files, so relative
  README references stay broken there.
- Replace em-dash separators in user-facing output (`adrkit instructions`
  readiness flags, `adrkit list` empty state), help text, docs, comments,
  and test fixtures with `-` or `:`.
