---
"adr-kit": patch
---

Show a label only where the picture has its object. A deliberation card chips
its state only when it is an exception — `settled` is what a node is when
nothing else is said, and the chosen answer already reads as settled — while a
folded option keeps its state as plain text. In both offline views the legend
now keys only the marks the view draws: the selected-answer key waits for a
settled option, the override key for a question that took other than the
recommendation, and the map's supersede, reference, and deliberation keys for
their edge or marker. A view with nothing to key draws no legend panel, and the
Info panel lists a statistic only when its count is non-zero.

The tree's edge keys now carry a line sample in the stroke they name, and the
tree draws exactly two edge styles to name: the gray dependency link and the
green frontier link a settled choice gives its follow-up. The third, lighter
stroke that marked nested links is gone, because its rule also fired for the
session card's edges and so no honest label covered it.

Whether a follow-up question was unlocked is now decided once in the outline
layer and recorded on the card, so the drawn edge, the legend, and Mermaid read
one answer instead of each deriving its own.
