---
name: adrkit-visualize
description: Use when the user asks to visualize an existing ADR, its deliberation tree, or the whole decision set and its relationships.
---

# ADR Kit Visualize

## Render the requested view

When the user asks to visualize a recorded ADR, a grilling result, or the whole
decision set, use these paths directly; do not start a new grilling session or
create another ADR. There are two levels, and the request picks one:

- **One decision — the decision tree.** Resolve the record with `adrkit list`
  and `adrkit show <N>`, and read its `## Deliberation` appendix. If there is
  no tree, explain that the record has no recorded deliberation to visualize;
  do not invent one. Render it with `adrkit tree <N> --html > "<path>.html"`.
- **All decisions — the decision map.** Render the whole set with
  `adrkit graph --html --out "<path>.html"`. It groups every decision by creation
  date, draws supersede and reference edges, and marks the decisions that carry
  a deliberation tree. A node links to its record file; it does not expand the
  tree yet.

Both renderers are built in, not agent-designed replacement pages. Write the
map with `--out` to any new path the user asks for, a temporary directory
included: the command resolves its record links against the file's own
location, so the cards open wherever it lands. Redirecting stdout instead
leaves record-relative links, which only resolve for a file written inside the
repository. Quote paths and avoid overwriting a record or an existing file.
Check the command succeeded.
Deliver a clickable link; the file is self-contained and works offline. After
successful HTML generation, open the file in the user's default browser unless
the user asks for a file only or says not to open it. A visualization request
is sufficient; do not ask for separate confirmation to open the browser.
Use the platform opener with the quoted file path. If a browser is unavailable
or opening fails, keep the file link and explain that it could not be opened.
The agent opens the browser; the CLI continues to emit HTML to stdout only.

Generate HTML only on an explicit visualization request, never automatically at
the end of a grilling session. For explicit format requests, both commands support `--text` and `--mermaid`;
only `graph` supports `--dot`. Return those formats without opening a browser. Keep Markdown as the source of
truth.
