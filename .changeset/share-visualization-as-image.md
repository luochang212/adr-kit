---
"adr-kit": minor
---

Share the offline views as a branded PNG. Both HTML views now carry a camera
button in the toolbar — the action makes a picture of the view rather than
sending one, so it is labelled Save as image rather than Share. It renders the
whole diagram on the client, the map serializing its SVG and the tree
rasterizing its laid-out cards, and frames it to the diagram's own shape: a
heading on the canvas above the diagram saying what the image is (the view, its
title, its statistics), and a one-line footer fused into the bottom edge
crediting the GitHub mark and `luochang212/adr-kit` beside the date.

Because the button carries an icon instead of a label, feedback is a status
line: it reports the saved file name and whether the copy reached the
clipboard, and never claims a folder — where a download lands is the browser's
decision, which a page cannot override. The image is downloaded and, where the
clipboard allows it, copied as well; nothing is uploaded and the page stays
self-contained.
