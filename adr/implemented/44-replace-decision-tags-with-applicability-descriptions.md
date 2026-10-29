---
status: implemented
date: 2026-10-29
description: Explain when each decision should be read without maintaining a
  topic taxonomy or category-based visualization colors.
raised-by: human
decided-by: human
created: 2026-10-29
commit: 8316bb7
paths:
  - src/**
  - skills/**
  - adr/**
  - test/**
  - docs/**
  - README.md
  - README.zh.md
  - AGENTS.md
  - site/src/**
  - site/public/llms.txt
---

# ADR: 44 Replace decision tags with applicability descriptions

## Problem

Records carry optional free-form tags, but the vocabulary is ungoverned and mixes topics, objects and process names. The maintainer wants a sentence that helps an agent decide when to read a record, and explicitly requested removing tags throughout the product. Tags currently also power map filtering and category colors, making a discovery change affect the visualization surface.

## Decision

Replace tags with a required single-line description explaining the subject and circumstances in which the record is relevant. Titles continue to name the choice; descriptions route discovery and never substitute for reading the record. List and scope results expose the sentence, and the atlas uses it in its directory, reader and local search. Draft templates leave the field empty and fail validation until authored. The CLI does not invent descriptions or add a description flag.

Remove tag parsing, validation, propagation, UI and the --tag option without an alias or migration command. Preserve paths as the deterministic file-governance axis from ADR 22 and ADR 23. Use existing lifecycle state for visual colors: a single accent for current decisions and gray dashed styling with explicit text for archived ones. Do not infer categories from descriptions or add another color field.

This partially replaces the theme-classification choices in ADR 18/22 and tag-driven map presentation in ADR 9/36; their lifecycle, scope, relationships and visualization-object contracts remain active. The user determined tag removal and sentence-based discovery. The agent chose lifecycle coloring and the single-line validation boundary.

The format break migrates all repository front matter, including archives, in this explicit change: remove tags and author descriptions from each record. Archived rationales and deliberation bodies remain historical, including statements about tags. This is the deliberate migration allowed by ADR 30, not a rewrite of the original choices. No backward-compatibility shim is retained.

## Alternatives considered

- Keep tags alongside descriptions: rejected by the maintainer's request to remove the taxonomy and its upkeep.
- Use titles alone: they state the chosen outcome but do not consistently expose the situations where the record matters.
- Derive descriptions automatically from titles or the first paragraph: repeats outcomes or context without reliably explaining applicability.
- Replace tag colors with another maintained classification or random per-record colors: adds a new field or meaningless visual variation; lifecycle already has stable meaning and non-color cues.

## Consequences

### Verification

All lifecycle records validate a substantive single-line description; missing, empty and multiline values fail, and old tags are unknown fields. Fresh templates fail until filled. Lifecycle moves preserve descriptions. List and relevant expose descriptions without changing candidate matching. CLI rejects --tag before writing output. All visualizations retain relationships, dates, source links, keyboard interactions and lifecycle labels without tag data or category color logic. Both themes and languages pass the browser gate; package resources and installed skills remain synchronized.

### Trade-offs

Descriptions need author judgment and must stay aligned with a decision's actual scope. Titles or prose cannot mechanically supply reliable applicability, so external records require authored descriptions during upgrade. Removing --tag breaks existing map export commands. Category colors disappear; lifecycle text, dashed borders and relation styles preserve meaning. This change does not improve semantic recall by itself or guarantee that agents consult every relevant decision.
