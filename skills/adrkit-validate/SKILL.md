---
name: adrkit-validate
description: Use when checking ADR record format before implementation, rejection, archival, or commit.
---

# ADR Kit Validate

Run `adrkit validate [name]` for one record or `adrkit validate` for the repository. All four lifecycle folders are checked. A fresh proposal or record template intentionally fails until required sections contain real content. Fix the exact reported requirement; do not add placeholder prose merely to pass. Validate again after every lifecycle move.
