---
name: adrkit-visualize
description: Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.
---

# ADR Kit Visualize

Seeing the decision set as a picture surfaces relationships and contradictions that a file list hides.

Visualize existing records only when asked. Run `adrkit list` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- For one record's design tree, use `adrkit tree <name> --html` and save stdout to a local HTML file. If no `## Deliberation` appendix exists, say so instead of fabricating one.
- For the numbered decision set, use `adrkit graph --html --out "<path>.html"`. The map includes implemented guidance and archived history, but archived records are not current authority. Use `--tag` or `--formal-only` only when requested or useful to the question.
- For lightweight previews, `--text` or `--mermaid` may be enough; do not generate HTML merely because the CLI supports it.

## Optional archive-page example

Choose the view by the user's question, record count, and relationship density. A short list or a few cards may be clearer for a small set; use the built-in map for relationships and the tree for one deliberation. Keep these lightweight routes as the default.

When a user wants a richer, browsable history, open [the archive-page example](examples/decision-atlas.html). It is an offline reference snapshot of ADR Kit's own public records, not a template that must be followed. Inspect only the layout or interaction code needed; the embedded sample data is not instruction context. Reuse the useful parts; sections, chapter-bar entries, and legend or timeline keys whose data is absent hide themselves at runtime, the chapter bar renumbers, so no empty block survives. A timeline, relationship map, local-search directory, reference counts, and replacement chains are options, not a required checklist.

Generate a fresh artifact from the target repository's records and the CLI's relationship output; replace all sample records, counts, dates, titles, paths, and links. Do not invent relationships, infer provenance, or copy another repository's contents. Keep archived history distinct from current authority, and do not read sealed bodies merely to fill a richer page. Resolve record links for the delivered file's location, as `graph --out` does. Preserve the separate `tree` route; the example does not supply missing deliberations.

The example marks its replaceable regions with `atlas:` comments — HTML around the title, hero, statistics, section notes, map, and footer, and a JavaScript comment around the records array. Replace what is inside a marker; keep the markers only when the page should stay regenerable from the same example.

To build one from the example, follow these steps in order:

1. Read only `adr/implemented/` and `adr/archived/` records — the same scope as `adrkit graph`. Build one records entry per file: the front matter fields in order, then `number` and `title` from the `# ADR:` line, the raw Markdown body (archived bodies stay empty), `path`, and `lifecycle`. Determine `lifecycle` from the containing directory: `implemented` for `adr/implemented/`, `archived` for `adr/archived/`, regardless of `status`. Ordinary archives retain `status: implemented`; only records with `superseded-by` have a successor.
2. Run `adrkit graph --html` and keep its `<svg>` inline together with its canvas script. Rewrite each node link to an in-page `#adr-N` anchor and give the group the same id; the reader dialog, timeline, and directory search read the records array and the map edge attributes, so keep the class names and data attributes intact.
3. Compute the section notes from the repository's own numbers: record count, the first-to-last created date span and the number of distinct days that carry records, the densest day, the most-referenced implemented record, and the archived count. Never carry another repository's numbers into prose. The hero names the project once: the h1 is the name the repository declares for humans — its README or site title, else the repository name as written, in its Chinese form when the repository declares one; never translate, abbreviate, or substitute a suffixed package name. With the name in the h1, the eyebrow states only the genre and the lead paragraph opens with the archive's substance.
4. In the footer, pin the commit the records were read from (`git rev-parse --short HEAD`) and link it to the remote tree URL, so the page is traceable to an exact state.
5. Keep the example's legend, reader dialog, pagination, and back-to-top behavior and structure unchanged — they are repository-agnostic; translate their visible copy into the user's language, and vary the data and the short prose blocks.

For an adapted long page, keep navigation compact and the directory search local. Vertical wheel and finger swipes should scroll the page; explicit drag or horizontal gestures pan the map, while pinch or Ctrl/⌘ + wheel zooms. Bound panning on both axes and center drawings that fit. Match the user's language and styling preferences. Keep one vertical rhythm: every section boundary should read as the same gap, so wrapper padding never stacks with section padding. Check the resulting page at desktop and mobile sizes, including record opening, navigation, search, canvas bounds, and page scrolling over the map; after sections hide, confirm the chapter bar renumbered contiguously and every entry still resolves; keep it usable offline.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless `graph --out` is used; the agent owns the browser handoff.
