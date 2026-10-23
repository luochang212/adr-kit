---
status: implemented
date: 2026-10-23
raised-by: agent
decided-by: human
created: 2026-10-23
tags:
  - website
paths:
  - site/src/layouts/Base.astro
  - test/site-language.test.ts
commit: cad88d2
---

# ADR: 38 prefer Chinese anywhere in the browser language list for the homepage

## Problem

The homepage's automatic detection shipped the same day picked the first
`en`/`zh` entry in the browser's ordered language list. A reader whose list is
`["en-US", "zh-Hans-CN"]` — typically an English browser or system UI above a
Chinese entry — landed on the English homepage even though they read Chinese.
The maintainer hit exactly this on the live site and asked whether presence of
Chinese, not list order, should govern.

## Decision

On the default entry, any entry in the browser's language list (falling back to
`navigator.language`) that starts with `zh` selects the Chinese homepage; only
a list with no `zh` entry gets English. The list's internal order is not
consulted for the `en`-versus-`zh` choice. The rest of the precedence chain is
unchanged: an explicit `?lang=en|zh` switch wins first, then the saved
`adr-kit.language` preference, then detection. This replaces the first-supported-
entry rule from the un-ADRed detection feature and was determined by the
maintainer for this project's primarily Chinese-reading audience.

## Alternatives considered

- **First supported entry wins** (the previous rule): rejected. It shows
  English to any reader who ranks English first even when their list also has
  Chinese, and browsers place English first for UI-language reasons that say
  little about which language this project's docs should use.
- **Chinese only when it is the first entry**: rejected. It misses the common
  second-place `zh-Hans-CN` configuration that motivated this change.

## Consequences

### Verification

- `test/site-language.test.ts` runs the shipped script in a VM and expects a
  Chinese redirect for `en-GB`-first and third-place `zh` lists, keeps the
  English default for lists without `zh`, and still ignores non-language
  prefixes such as `zhongwen`.
- Saved and explicit `?lang=` preferences keep overriding detection, and the
  plain `/zh/` link stays Chinese.

### Trade-offs

- A reader who deliberately ranks English first and also lists Chinese now
  gets Chinese. The `EN` switch (which persists via `?lang=` into
  `adr-kit.language`) is their durable override.
