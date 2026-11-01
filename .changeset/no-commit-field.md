"adr-kit": minor
---

Remove git provenance from the record format: the optional `commit`
front-matter field is gone.

- `adrkit record` and `adrkit implement` no longer stamp the short HEAD hash
  into new decisions, the parser drops the key from the canonical order, and
  validation stops checking its shape. The atlas payload carries no
  per-record commit; the page footer still pins the build commit.
- Breaking: a record still carrying `commit:` fails `adrkit validate` with
  `unknown front matter field "commit"`. Delete the line — the migration is
  mechanical, archived records included, in an explained migration commit.
  Where a decision landed stays derivable from Git history: the parent of
  the commit that added the record file names the state it was recorded
  against.
