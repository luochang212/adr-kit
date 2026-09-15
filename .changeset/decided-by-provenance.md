---
'adr-kit': minor
---

Add `decided-by: human | machine` to the record front matter: the CLI infers
it from the environment the recording command ran in, and it does not
establish who chose or authorized the decision. No author name or account is
recorded: git already owns identity, and an agent session commits as the
human user.

- `adrkit decide` and `adrkit accept` stamp the value from the environment the
  command runs in; a detected agent session yields `machine`, otherwise
  `human`. There is no flag to set it.
- `adrkit propose` writes nothing, and a `decided-by` written into a draft is
  rejected while the draft exists and dropped when it is promoted.
- `adrkit supersede` preserves the retiring record's value instead of
  re-stamping it: it describes the environment inferred when the decision was
  recorded, not the environment that ran the retirement.
- `validate` requires the field on accepted and superseded records and rejects
  it on drafts. The field sits between `date` and `created` in canonical order.

**Breaking for existing repositories:** accepted and superseded records
recorded before this release carry no `decided-by` and fail `adrkit validate`
until one is supplied. The CLI never writes it for them, because a machine
inventing an origin for a past decision is exactly the fabricated history this
field exists to prevent; supply the value you know to be true by hand, in the
record. The record-format reference states plainly that the value is an
inferred stamp, weaker evidence than `date` and `commit`, rather than proof,
and names what defeats it.
