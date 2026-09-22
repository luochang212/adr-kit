---
status: accepted
date: 2026-09-22
raised-by: human
decided-by: human
created: 2026-09-22
commit: 02536cc
tags: [visualization, agent-integration]
---

# ADR: 12 Open requested ADR visualizations in the browser by default

## Problem

ADR 8 and ADR 9 made file-link delivery the default and required a separate
request to open a browser. After receiving the all-decision map, the maintainer
explicitly asked that future visualization requests proactively open it. This
amends only ADR 8 and ADR 9's delivery policy; their rendering and routing
decisions remain accepted and are retained below. The older records stay
accepted because this is a partial amendment, not replacement of those views.

## Decision

When a user requests an ADR visualization, the agent generates it with the
built-in renderer, opens the resulting file in the default browser, and also
returns a clickable file link. A file-only or no-open instruction overrides
this default. When opening is unavailable or fails, explain and retain the
link. The CLI itself still emits HTML to stdout without launching a browser.

Retain the offline card tree from ADR 8: one decision uses `adrkit tree <N>
--html`, with chosen answers, expandable alternatives, annotated states,
recommendation and override signals, and dependency nesting. Retain the map
from ADR 9: the whole set uses `adrkit graph --html`, grouped by creation date,
with supersede and reference edges, tag tinting, retired styling, record links,
and stable node identities. Both remain built-in, self-contained renderers
with no CDN or additional runtime dependency. Their shared canvas interaction
contract remains governed by ADR 11.

The `adrkit-grill` skill continues to route both requests. The map marks
renderable deliberation as defined in ADR 10 without excluding other records;
map-to-tree linkage remains deferred. The website demo remains independent.
HTML is generated only on visualization requests, never automatically after a
grilling session. Explicit text, Mermaid, or DOT requests keep their formats
and do not trigger browser opening.

## Alternatives considered

Keep returning only a link unless the user separately asks to open it: this
was the previous policy, which the maintainer explicitly replaced to make a
visualization request immediately show its result.

## Consequences

Browser launch belongs to the agent workflow, so command-line exports remain
usable in pipelines and headless environments. The maintained skill, generated
integration template, installed local skill, bilingual documentation, and
workflow specification carry the new default. Existing installations receive
it through `adrkit update` after the updated package is installed. Both
provenance fields are human because the maintainer raised and chose this change.
