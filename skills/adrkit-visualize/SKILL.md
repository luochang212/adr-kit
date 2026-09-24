---
name: adrkit-visualize
description: Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.
---

# ADR Kit Visualize

Visualize existing records only when asked. Run `adrkit list` first, then read the record or relationships relevant to the requested view. Do not create a decision or invent a deliberation tree to make a picture.

- For one record's design tree, use `adrkit tree <name> --html` and save stdout to a local HTML file. If no `## Deliberation` appendix exists, say so instead of fabricating one.
- For the numbered decision set, use `adrkit graph --html --out "<path>.html"`. The map includes implemented guidance and archived history, but archived records are not current authority. Use `--tag` or `--formal-only` only when requested or useful to the question.
- For lightweight previews, `--text` or `--mermaid` may be enough; do not generate HTML merely because the CLI supports it.

When the user requests HTML visualization, open the generated file in the default browser if available and return a clickable file path. If the user asks for a file only or says not to open it, leave the browser alone. If opening is unavailable or fails, explain that briefly and still return the file path. The CLI emits HTML to stdout unless `graph --out` is used; the agent owns the browser handoff.
